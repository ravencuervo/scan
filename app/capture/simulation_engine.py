import time
import math
import random
import threading
import logging
from typing import List, Optional, Callable
from app.capture.hal import BaseCaptureEngine, ScannedAP, channel_to_frequency, rssi_to_quality

logger = logging.getLogger("aeroscan.capture.simulation")

# Simulated realistic Access Points representing a high-density academic & urban environment
DEFAULT_SIMULATED_PROFILES = [
    # Heavy congestion on Channel 6 (Real scenario in dense environments)
    {"ssid": "UNA-Puno_Administracion", "bssid": "00:1A:2B:44:88:01", "channel": 6, "base_rssi": -52, "auth": "WPA2-Enterprise", "width": 20, "vendor": "Cisco"},
    {"ssid": "UNA-Puno_Docentes", "bssid": "00:1A:2B:44:88:02", "channel": 6, "base_rssi": -58, "auth": "WPA2-Enterprise", "width": 20, "vendor": "Cisco"},
    {"ssid": "UNA-Puno_Alumnos", "bssid": "00:27:0D:12:34:56", "channel": 6, "base_rssi": -65, "auth": "WPA2", "width": 20, "vendor": "Cisco Meraki"},
    {"ssid": "Lab_Informatica_AP1", "bssid": "50:D4:F7:99:AA:11", "channel": 6, "base_rssi": -62, "auth": "WPA2", "width": 20, "vendor": "TP-Link"},
    {"ssid": "Lab_Informatica_AP2", "bssid": "50:D4:F7:99:AA:12", "channel": 6, "base_rssi": -69, "auth": "WPA2", "width": 20, "vendor": "TP-Link"},
    {"ssid": "Cafeteria_FreeWiFi", "bssid": "B0:95:75:33:11:44", "channel": 6, "base_rssi": -76, "auth": "Abierto", "width": 20, "vendor": "TP-Link"},
    {"ssid": "Biblioteca_Central", "bssid": "70:4F:57:A1:B2:C3", "channel": 6, "base_rssi": -74, "auth": "WPA2", "width": 20, "vendor": "Ubiquiti"},
    {"ssid": "Direccion_Academica", "bssid": "88:36:6C:55:66:77", "channel": 6, "base_rssi": -78, "auth": "WPA3", "width": 20, "vendor": "MikroTik"},
    
    # Harmful Adjacent Channel Interference (Canal 7 y Canal 5 solapándose con canal 6)
    {"ssid": "Vecino_Claro_Home", "bssid": "20:4E:7F:DD:EE:01", "channel": 7, "base_rssi": -71, "auth": "WPA2", "width": 20, "vendor": "Netgear"},
    {"ssid": "Movistar_Fibra_7B", "bssid": "78:11:DC:88:77:66", "channel": 5, "base_rssi": -75, "auth": "WPA2", "width": 20, "vendor": "Huawei"},

    # Moderately occupied Channel 11
    {"ssid": "Auditorio_Magno", "bssid": "70:4F:57:C4:D5:E6", "channel": 11, "base_rssi": -60, "auth": "WPA2", "width": 20, "vendor": "Ubiquiti"},
    {"ssid": "Postgrado_Estadistica", "bssid": "24:A4:3C:99:88:77", "channel": 11, "base_rssi": -68, "auth": "WPA2", "width": 20, "vendor": "Ubiquiti"},
    {"ssid": "Impresora_Canon_WiFi", "bssid": "00:14:22:33:44:55", "channel": 11, "base_rssi": -82, "auth": "WPA2", "width": 20, "vendor": "Dell"},

    # Clean / Low interference Channel 1 (Ideal optimal recommendation target!)
    {"ssid": "Decanato_Ingenieria", "bssid": "88:36:6C:11:22:33", "channel": 1, "base_rssi": -72, "auth": "WPA3", "width": 20, "vendor": "MikroTik"},

    # 5 GHz Band (Modern, clean channels)
    {"ssid": "UNA-Puno_5G_Campus", "bssid": "00:1A:2B:55:99:01", "channel": 36, "base_rssi": -55, "auth": "WPA3-Enterprise", "width": 80, "vendor": "Cisco"},
    {"ssid": "Lab_Sistemas_5G", "bssid": "70:4F:57:55:00:11", "channel": 48, "base_rssi": -63, "auth": "WPA3", "width": 40, "vendor": "Ubiquiti"},
    {"ssid": "Servidores_WiFi_Backbone", "bssid": "88:36:6C:55:99:88", "channel": 149, "base_rssi": -59, "auth": "WPA2", "width": 80, "vendor": "MikroTik"},
    {"ssid": "Investigacion_AI_5G", "bssid": "9C:3D:CF:11:22:44", "channel": 157, "base_rssi": -67, "auth": "WPA3", "width": 80, "vendor": "ASUS"}
]

class SimulationEngine(BaseCaptureEngine):
    """
    Simulated Wi-Fi Capture Engine with realistic RF propagation models,
    multipath fading variation, and channel interference dynamics.
    """

    def __init__(self, callback: Optional[Callable[[List[ScannedAP]], None]] = None, interval: float = 2.0):
        super().__init__(callback)
        self.interval = interval
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.profiles = list(DEFAULT_SIMULATED_PROFILES)
        self.step = 0

    def is_hardware_available(self) -> bool:
        return True  # Always available

    def scan_once(self) -> List[ScannedAP]:
        self.step += 1
        now = time.time()
        results: List[ScannedAP] = []

        for p in self.profiles:
            # RF multipath fading: sinusoidal drift + Gaussian noise
            drift = 2.5 * math.sin((self.step * 0.25) + int(p["bssid"][-1], 16))
            noise = random.gauss(0, 1.2)
            calculated_rssi = int(p["base_rssi"] + drift + noise)
            
            # Constrain to realistic dBm range
            rssi = max(-95, min(-35, calculated_rssi))
            quality = rssi_to_quality(rssi)
            ch = p["channel"]
            band = "5GHz" if ch >= 36 else "2.4GHz"

            results.append(ScannedAP(
                bssid=p["bssid"],
                ssid=p["ssid"],
                channel=ch,
                frequency_mhz=channel_to_frequency(ch),
                band=band,
                rssi=rssi,
                signal_quality=quality,
                security=p["auth"],
                channel_width=p["width"],
                vendor=p["vendor"],
                timestamp=now
            ))
        return results

    def start(self) -> bool:
        if self.is_running:
            return True
        self._stop_event.clear()
        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="AeroScan-SimEngine")
        self._thread.start()
        logger.info("Simulation capture engine started.")
        return True

    def stop(self) -> None:
        self.is_running = False
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("Simulation capture engine stopped.")

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                aps = self.scan_once()
                if self.callback and aps:
                    self.callback(aps)
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
            self._stop_event.wait(self.interval)
