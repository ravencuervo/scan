import sys
from pathlib import Path

# Base directories (PyInstaller frozen bundle vs local dev)
if getattr(sys, "frozen", False):
    EXE_DIR = Path(sys.executable).parent
    BASE_DIR = Path(getattr(sys, "_MEIPASS", EXE_DIR))
    DATA_DIR = EXE_DIR / "data"
    REPORTS_DIR = EXE_DIR / "reports_output"
else:
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    DATA_DIR = BASE_DIR / "data"
    REPORTS_DIR = BASE_DIR / "reports_output"

APP_DIR = BASE_DIR / "app"

# Ensure runtime directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Database
DB_PATH = DATA_DIR / "aeroscan.db"

# Server configuration
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8765

# Wi-Fi standard channel center frequencies (MHz)
CHANNELS_24_GHZ = {
    1: 2412, 2: 2417, 3: 2422, 4: 2427, 5: 2432,
    6: 2437, 7: 2442, 8: 2447, 9: 2452, 10: 2457,
    11: 2462, 12: 2467, 13: 2472, 14: 2484
}

# Standard 2.4 GHz non-overlapping channels
NON_OVERLAPPING_CHANNELS_24 = [1, 6, 11]

# Common 5 GHz channels (UNII-1, UNII-2, UNII-2e, UNII-3)
CHANNELS_5_GHZ = [
    36, 40, 44, 48, 52, 56, 60, 64,
    100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
    149, 153, 157, 161, 165
]

# Analysis thresholds
CRITICAL_AP_DENSITY_24 = 5
WARNING_AP_DENSITY_24 = 3
MIN_ACCEPTABLE_RSSI = -75  # dBm
GOOD_RSSI = -65  # dBm
EXCELLENT_RSSI = -50  # dBm
