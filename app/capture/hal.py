import abc
from dataclasses import dataclass, asdict
from typing import List, Optional, Callable, Dict, Any
from app.core.config import CHANNELS_24_GHZ

# Common OUI Vendor prefixes
COMMON_OUIS = {
    "00:14:22": "Dell",
    "00:26:08": "Apple",
    "3C:06:30": "Apple",
    "AC:DE:48": "Apple",
    "F0:18:98": "Apple",
    "00:1A:2B": "Cisco",
    "00:27:0D": "Cisco Meraki",
    "50:06:04": "Cisco",
    "F4:4E:05": "Cisco",
    "50:D4:F7": "TP-Link",
    "E8:48:B8": "TP-Link",
    "B0:95:75": "TP-Link",
    "70:4F:57": "Ubiquiti",
    "B4:FB:E4": "Ubiquiti",
    "24:A4:3C": "Ubiquiti",
    "04:18:D6": "Ubiquiti",
    "84:16:F9": "Intel",
    "A4:BB:6D": "Intel",
    "DC:FB:02": "Intel",
    "28:6C:07": "Xiaomi",
    "64:64:4A": "Xiaomi",
    "78:11:DC": "Huawei",
    "00:E0:FC": "Huawei",
    "40:4E:36": "Huawei",
    "20:4E:7F": "Netgear",
    "C0:FF:D4": "Netgear",
    "9C:3D:CF": "ASUS",
    "04:D4:C4": "ASUS",
    "D8:07:B6": "Samsung",
    "BC:D1:1F": "Samsung",
    "88:36:6C": "MikroTik",
    "48:8F:5A": "MikroTik"
}

def lookup_vendor(bssid: str) -> str:
    """Resolve vendor from MAC OUI prefix."""
    if not bssid or len(bssid) < 8:
        return "Genérico / Desconocido"
    prefix = bssid.upper()[:8]
    return COMMON_OUIS.get(prefix, "Fabricante Estándar")

def channel_to_frequency(channel: int) -> int:
    """Convert Wi-Fi channel number to center frequency in MHz."""
    if channel in CHANNELS_24_GHZ:
        return CHANNELS_24_GHZ[channel]
    elif 36 <= channel <= 165:
        return 5000 + (channel * 5)
    return 2412

def quality_to_rssi(quality_pct: int) -> int:
    """Convert Windows Wi-Fi quality percentage (0-100) to approximate RSSI in dBm."""
    # Empirical standard: 100% ~ -50 dBm or better, 0% ~ -100 dBm
    return int((quality_pct / 2) - 100)

def rssi_to_quality(rssi_dbm: int) -> int:
    """Convert RSSI in dBm to quality percentage (0-100)."""
    if rssi_dbm <= -100:
        return 0
    elif rssi_dbm >= -50:
        return 100
    return int(2 * (rssi_dbm + 100))

@dataclass
class ScannedAP:
    bssid: str
    ssid: str
    channel: int
    frequency_mhz: int
    band: str
    rssi: int
    signal_quality: int
    security: str
    channel_width: int = 20
    vendor: str = "Desconocido"
    timestamp: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

class BaseCaptureEngine(abc.ABC):
    """Abstract interface for all AeroScan capture engines."""

    def __init__(self, callback: Optional[Callable[[List[ScannedAP]], None]] = None):
        self.callback = callback
        self.is_running = False

    @abc.abstractmethod
    def start(self) -> bool:
        """Start spectrum capture thread."""
        pass

    @abc.abstractmethod
    def stop(self) -> None:
        """Stop spectrum capture."""
        pass

    @abc.abstractmethod
    def scan_once(self) -> List[ScannedAP]:
        """Perform a single immediate scan sweep."""
        pass

    @abc.abstractmethod
    def is_hardware_available(self) -> bool:
        """Check if required hardware/OS capability is present."""
        pass
