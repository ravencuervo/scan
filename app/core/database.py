import sqlite3
import json
import logging
import hashlib
import secrets
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from app.core.config import DB_PATH

logger = logging.getLogger("aeroscan.database")

def get_db_connection() -> sqlite3.Connection:
    """Return a thread-safe SQLite connection with row factory and WAL mode enabled."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_database() -> None:
    """Initialize database tables and indexes."""
    conn = get_db_connection()
    try:
        with conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT DEFAULT 'ingeniero',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    location TEXT DEFAULT 'Laboratorio / Sitio',
                    engine_type TEXT NOT NULL,
                    status TEXT DEFAULT 'running',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ended_at TIMESTAMP,
                    notes TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS access_points (
                    bssid TEXT PRIMARY KEY,
                    ssid TEXT,
                    vendor TEXT,
                    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS samples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    bssid TEXT NOT NULL,
                    ssid TEXT,
                    channel INTEGER NOT NULL,
                    frequency_mhz INTEGER,
                    band TEXT NOT NULL,
                    rssi INTEGER NOT NULL,
                    signal_quality INTEGER,
                    security TEXT,
                    channel_width INTEGER DEFAULT 20,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (bssid) REFERENCES access_points(bssid)
                );

                CREATE TABLE IF NOT EXISTS channel_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    channel INTEGER NOT NULL,
                    band TEXT NOT NULL,
                    ap_count INTEGER NOT NULL,
                    co_channel_interference REAL NOT NULL,
                    adjacent_interference REAL NOT NULL,
                    total_penalty REAL NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS diagnostic_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    optimal_channel_24 INTEGER,
                    optimal_channel_5 INTEGER,
                    summary TEXT,
                    recommendations_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_samples_session_ts ON samples(session_id, timestamp);
                CREATE INDEX IF NOT EXISTS idx_samples_channel ON samples(channel);
                CREATE INDEX IF NOT EXISTS idx_samples_bssid ON samples(bssid);
                CREATE INDEX IF NOT EXISTS idx_snapshots_session ON channel_snapshots(session_id);
            """)

            # Ensure user_id column exists if table was created in earlier version
            try:
                conn.execute("ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id);")
            except sqlite3.OperationalError:
                pass

            # Seed default users if table is empty
            cursor = conn.execute("SELECT COUNT(*) FROM users")
            if cursor.fetchone()[0] == 0:
                DatabaseManager.seed_default_users(conn)
            else:
                # Unify roles to 'operador'
                conn.execute("UPDATE users SET role = 'operador';")

        logger.info(f"Database initialized successfully at {DB_PATH}")
    finally:
        conn.close()

class DatabaseManager:
    """Helper class for common database operations and user authentication."""

    @staticmethod
    def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
        if not salt:
            salt = secrets.token_hex(16)
        pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
        return pwd_hash, salt

    @staticmethod
    def verify_password(password: str, password_hash: str, salt: str) -> bool:
        check_hash, _ = DatabaseManager.hash_password(password, salt)
        return secrets.compare_digest(check_hash, password_hash)

    @staticmethod
    def seed_default_users(conn: sqlite3.Connection) -> None:
        admin_hash, admin_salt = DatabaseManager.hash_password("admin123")
        auditor_hash, auditor_salt = DatabaseManager.hash_password("aeroscan2026")
        
        conn.execute("""
            INSERT INTO users (username, password_hash, salt, full_name, role)
            VALUES (?, ?, ?, ?, ?)
        """, ("admin", admin_hash, admin_salt, "Operador de Espectro", "operador"))
        
        conn.execute("""
            INSERT INTO users (username, password_hash, salt, full_name, role)
            VALUES (?, ?, ?, ?, ?)
        """, ("auditor", auditor_hash, auditor_salt, "Operador de Espectro", "operador"))
        logger.info("Default users seeded: single unified role 'operador'")

    @staticmethod
    def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cursor = conn.execute("SELECT * FROM users WHERE username = ?", (username.strip().lower(),))
            row = cursor.fetchone()
            if not row:
                return None
            user_data = dict(row)
            if DatabaseManager.verify_password(password, user_data["password_hash"], user_data["salt"]):
                del user_data["password_hash"]
                del user_data["salt"]
                return user_data
            return None
        finally:
            conn.close()

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cursor = conn.execute("SELECT id, username, full_name, role, created_at FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @staticmethod
    def create_session(name: str, location: str = "Sitio", engine_type: str = "windows", notes: str = "", user_id: Optional[int] = None) -> int:
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute(
                    "INSERT INTO sessions (name, location, engine_type, status, notes, user_id) VALUES (?, ?, ?, 'running', ?, ?)",
                    (name, location, engine_type, notes, user_id)
                )
                return cursor.lastrowid
        finally:
            conn.close()

    @staticmethod
    def end_session(session_id: int) -> None:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    "UPDATE sessions SET status = 'completed', ended_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (session_id,)
                )
        finally:
            conn.close()

    @staticmethod
    def record_samples(session_id: int, ap_list: List[Dict[str, Any]]) -> None:
        if not ap_list:
            return
        conn = get_db_connection()
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with conn:
                for ap in ap_list:
                    bssid = ap.get("bssid", "").upper()
                    ssid = ap.get("ssid", "<Oculta>")
                    vendor = ap.get("vendor", "Desconocido")

                    # Upsert Access Point
                    conn.execute("""
                        INSERT INTO access_points (bssid, ssid, vendor, first_seen, last_seen)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(bssid) DO UPDATE SET
                            ssid = excluded.ssid,
                            last_seen = excluded.last_seen
                    """, (bssid, ssid, vendor, now_str, now_str))

                    # Insert Sample
                    conn.execute("""
                        INSERT INTO samples (
                            session_id, bssid, ssid, channel, frequency_mhz,
                            band, rssi, signal_quality, security, channel_width, timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        session_id,
                        bssid,
                        ssid,
                        int(ap.get("channel", 1)),
                        int(ap.get("frequency_mhz", 2412)),
                        ap.get("band", "2.4GHz"),
                        int(ap.get("rssi", -80)),
                        int(ap.get("signal_quality", 50)),
                        ap.get("security", "WPA2"),
                        int(ap.get("channel_width", 20)),
                        now_str
                    ))
        finally:
            conn.close()

    @staticmethod
    def save_channel_snapshot(session_id: int, snapshot_data: List[Dict[str, Any]]) -> None:
        if not snapshot_data:
            return
        conn = get_db_connection()
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with conn:
                for s in snapshot_data:
                    conn.execute("""
                        INSERT INTO channel_snapshots (
                            session_id, channel, band, ap_count,
                            co_channel_interference, adjacent_interference,
                            total_penalty, timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        session_id,
                        s["channel"],
                        s["band"],
                        s["ap_count"],
                        s["co_channel_interference"],
                        s["adjacent_interference"],
                        s["total_penalty"],
                        now_str
                    ))
        finally:
            conn.close()

    @staticmethod
    def save_diagnostic_report(session_id: int, opt_24: int, opt_5: int, summary: str, recs: List[Dict[str, Any]]) -> int:
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute("""
                    INSERT INTO diagnostic_reports (session_id, optimal_channel_24, optimal_channel_5, summary, recommendations_json)
                    VALUES (?, ?, ?, ?, ?)
                """, (session_id, opt_24, opt_5, summary, json.dumps(recs, ensure_ascii=False)))
                return cursor.lastrowid
        finally:
            conn.close()

    @staticmethod
    def get_sessions() -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cursor = conn.execute("""
                SELECT s.*, 
                       (SELECT COUNT(*) FROM samples WHERE session_id = s.id) as sample_count,
                       (SELECT COUNT(DISTINCT bssid) FROM samples WHERE session_id = s.id) as unique_aps
                FROM sessions s ORDER BY s.id DESC
            """)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    @staticmethod
    def get_session(session_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cursor = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @staticmethod
    def get_session_samples(session_id: int, limit: int = 1000) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cursor = conn.execute("""
                SELECT s.*, ap.vendor 
                FROM samples s
                LEFT JOIN access_points ap ON s.bssid = ap.bssid
                WHERE s.session_id = ?
                ORDER BY s.id DESC LIMIT ?
            """, (session_id, limit))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
