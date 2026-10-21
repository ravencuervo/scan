import os
import sys
import json
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from pydantic import BaseModel

from app.core.config import SERVER_HOST, SERVER_PORT, REPORTS_DIR, BASE_DIR
from app.core.database import init_database, DatabaseManager
from app.capture.hal import ScannedAP, BaseCaptureEngine
from app.capture import create_capture_engine
from app.analysis.metrics import SpectrumAnalyzer
from app.analysis.optimizer import SpectrumOptimizer
from app.reports.pdf_generator import PDFReportGenerator
from app.reports.excel_exporter import ExcelReportExporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aeroscan.main")

# Initialize FastAPI App
app = FastAPI(
    title="AeroScan Core API",
    description="Motor de análisis y diagnóstico espectral de redes inalámbricas WiFi",
    version="1.0.0"
)

# Directories
DIST_DIR = BASE_DIR / "app" / "web" / "dist"
STATIC_DIR = BASE_DIR / "app" / "web" / "static"
TEMPLATES_DIR = BASE_DIR / "app" / "web" / "templates"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

# Mount static and assets files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

# State Management
class AppState:
    def __init__(self):
        self.current_session_id: Optional[int] = None
        self.engine_type: str = "simulation"
        self.engine: Optional[BaseCaptureEngine] = None
        self.latest_aps: List[ScannedAP] = []
        self.latest_metrics: Dict[str, Any] = {}
        self.active_websockets: List[WebSocket] = []
        self.lock = asyncio.Lock()

state = AppState()

# Pydantic schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class StartSessionRequest(BaseModel):
    name: str = "Auditoría de Espectro WiFi"
    location: str = "Edificio Central / UNA Puno"
    engine_type: str = "auto"
    notes: str = ""
    user_id: Optional[int] = None

# Active session tokens: token -> user dict
ACTIVE_TOKENS: Dict[str, Dict[str, Any]] = {}

# Callback for capture engine
def on_capture_callback(aps: List[ScannedAP]):
    state.latest_aps = aps
    # Compute metrics
    metrics = SpectrumAnalyzer.compute_channel_metrics(aps)
    state.latest_metrics = metrics

    # Save to SQLite if session is active
    if state.current_session_id:
        try:
            raw_aps = [ap.to_dict() for ap in aps]
            DatabaseManager.record_samples(state.current_session_id, raw_aps)
        except Exception as e:
            logger.error(f"Error persisting samples to SQLite: {e}")

@app.on_event("startup")
async def startup_event():
    init_database()
    logger.info("AeroScan Database initialized.")
    # Initialize default capture engine
    state.engine = create_capture_engine(engine_type="auto", callback=on_capture_callback)
    state.engine_type = "windows" if state.engine.__class__.__name__ == "WindowsNativeEngine" else ("scapy" if "Scapy" in state.engine.__class__.__name__ else "simulation")
    logger.info(f"Initialized capture engine: {state.engine.__class__.__name__} (Mode: {state.engine_type})")
    
    # Auto-start default background session
    state.current_session_id = DatabaseManager.create_session(
        name="Sesión Inicial de Monitoreo",
        location="Entorno Local",
        engine_type=state.engine_type,
        notes="Inicio automático de AeroScan"
    )
    state.engine.start()

@app.on_event("shutdown")
async def shutdown_event():
    if state.engine:
        state.engine.stop()
    if state.current_session_id:
        DatabaseManager.end_session(state.current_session_id)
    logger.info("AeroScan shutdown completed.")

# Web Routes
@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        with open(dist_index, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())

    index_file = TEMPLATES_DIR / "index.html"
    if not index_file.exists():
        return HTMLResponse("<h1>Error: index.html no encontrado</h1>", status_code=404)
    with open(index_file, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

# Authentication Endpoints
@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = DatabaseManager.authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    import secrets
    token = secrets.token_urlsafe(32)
    ACTIVE_TOKENS[token] = user
    return {"token": token, "user": user}

@app.get("/api/auth/me")
async def get_current_user(token: Optional[str] = None):
    if not token or token not in ACTIVE_TOKENS:
        raise HTTPException(status_code=401, detail="Sesión no iniciada o token inválido")
    return {"user": ACTIVE_TOKENS[token]}

@app.post("/api/auth/logout")
async def logout(token: Optional[str] = None):
    if token and token in ACTIVE_TOKENS:
        del ACTIVE_TOKENS[token]
    return {"status": "logged_out"}

# API Endpoints
@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "current_session_id": state.current_session_id,
        "engine_type": state.engine_type,
        "engine_class": state.engine.__class__.__name__ if state.engine else "None",
        "is_capturing": state.engine.is_running if state.engine else False,
        "total_aps_detected": len(state.latest_aps)
    }

@app.post("/api/session/start")
async def start_session(req: StartSessionRequest):
    if state.engine and state.engine.is_running:
        state.engine.stop()

    state.engine = create_capture_engine(engine_type=req.engine_type, callback=on_capture_callback)
    state.engine_type = req.engine_type
    
    session_id = DatabaseManager.create_session(
        name=req.name,
        location=req.location,
        engine_type=state.engine_type,
        notes=req.notes,
        user_id=req.user_id
    )
    state.current_session_id = session_id
    state.engine.start()

    logger.info(f"Started new session #{session_id} using engine: {state.engine_type}")
    return {"session_id": session_id, "engine_type": state.engine_type, "status": "started"}

@app.post("/api/session/stop")
async def stop_session():
    if state.engine:
        state.engine.stop()
    if state.current_session_id:
        DatabaseManager.end_session(state.current_session_id)
        last_id = state.current_session_id
        state.current_session_id = None
        return {"status": "stopped", "session_id": last_id}
    return {"status": "no_active_session"}

@app.get("/api/metrics/current")
async def get_current_metrics():
    if not state.latest_aps and state.engine:
        state.latest_aps = state.engine.scan_once()
        state.latest_metrics = SpectrumAnalyzer.compute_channel_metrics(state.latest_aps)

    recs = SpectrumOptimizer.generate_recommendations(state.latest_metrics)
    return {
        "metrics": state.latest_metrics,
        "recommendations": recs,
        "access_points": [ap.to_dict() for ap in state.latest_aps]
    }

@app.get("/api/sessions")
async def get_sessions_history():
    return DatabaseManager.get_sessions()

@app.get("/api/session/{session_id}/samples")
async def get_session_samples(session_id: int):
    return DatabaseManager.get_session_samples(session_id)

@app.post("/api/reports/pdf")
async def generate_pdf_report():
    if not state.latest_aps and state.engine:
        state.latest_aps = state.engine.scan_once()
        state.latest_metrics = SpectrumAnalyzer.compute_channel_metrics(state.latest_aps)

    sess = DatabaseManager.get_session(state.current_session_id or 1) or {
        "id": 1,
        "name": "Auditoría en Tiempo Real",
        "location": "Sede Central",
        "engine_type": state.engine_type
    }
    recs = SpectrumOptimizer.generate_recommendations(state.latest_metrics)
    ap_dicts = [ap.to_dict() for ap in state.latest_aps]

    pdf_path = PDFReportGenerator.generate(
        session_data=sess,
        analysis=state.latest_metrics,
        recommendations=recs,
        ap_list=ap_dicts
    )

    return {
        "filename": pdf_path.name,
        "download_url": f"/api/reports/download/{pdf_path.name}"
    }

@app.post("/api/reports/excel")
async def generate_excel_report():
    if not state.latest_aps and state.engine:
        state.latest_aps = state.engine.scan_once()
        state.latest_metrics = SpectrumAnalyzer.compute_channel_metrics(state.latest_aps)

    sess = DatabaseManager.get_session(state.current_session_id or 1) or {
        "id": 1,
        "name": "Auditoría en Tiempo Real",
        "location": "Sede Central",
        "engine_type": state.engine_type
    }
    recs = SpectrumOptimizer.generate_recommendations(state.latest_metrics)
    ap_dicts = [ap.to_dict() for ap in state.latest_aps]

    excel_path = ExcelReportExporter.export(
        session_data=sess,
        analysis=state.latest_metrics,
        recommendations=recs,
        ap_list=ap_dicts
    )

    return {
        "filename": excel_path.name,
        "download_url": f"/api/reports/download/{excel_path.name}"
    }

@app.get("/api/reports/download/{filename}")
async def download_report(filename: str):
    file_path = REPORTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )

# Real-time WebSocket streaming
@app.websocket("/ws/spectrum")
async def websocket_spectrum(websocket: WebSocket):
    await websocket.accept()
    state.active_websockets.append(websocket)
    try:
        while True:
            # Send latest metrics and AP list
            payload = {
                "type": "telemetry_update",
                "session_id": state.current_session_id,
                "engine_type": state.engine_type,
                "metrics": state.latest_metrics,
                "recommendations": SpectrumOptimizer.generate_recommendations(state.latest_metrics),
                "access_points": [ap.to_dict() for ap in state.latest_aps]
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        state.active_websockets.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in state.active_websockets:
            state.active_websockets.remove(websocket)
