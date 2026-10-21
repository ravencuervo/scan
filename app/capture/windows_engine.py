import subprocess
import re
import time
import threading
import logging
from typing import List, Optional, Callable
from app.capture.hal import BaseCaptureEngine, ScannedAP, channel_to_frequency, quality_to_rssi, lookup_vendor

logger = logging.getLogger("aeroscan.capture.windows")

class WindowsNativeEngine(BaseCaptureEngine):
    """
    Windows Native Wi-Fi Capture Engine.
    Uses Windows WLAN API and Netsh BSSID enumeration to capture Wi-Fi APs
    without requiring external USB adapters or monitor mode drivers.
    """

    def __init__(self, callback: Optional[Callable[[List[ScannedAP]], None]] = None, interval: float = 3.0):
        super().__init__(callback)
        self.interval = interval
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def is_hardware_available(self) -> bool:
        """Check if at least one active wireless interface exists in Windows."""
        try:
            res = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True,
                text=True,
                encoding="latin-1",
                timeout=5
            )
            # If "There is no wireless interface" or "No hay ninguna interfaz"
            text = res.stdout.lower()
            if "no hay ninguna interfaz" in text or "there is no wireless interface" in text:
                return False
            return res.returncode == 0 and ("nombre" in text or "name" in text or "guid" in text)
        except Exception as e:
            logger.warning(f"Error checking wireless interface: {e}")
            return False

    def scan_once(self) -> List[ScannedAP]:
        """Execute netsh wlan show networks mode=bssid and parse results."""
        aps: List[ScannedAP] = []
        try:
            res = subprocess.run(
                ["netsh", "wlan", "show", "networks", "mode=bssid"],
                capture_output=True,
                text=True,
                encoding="latin-1",
                timeout=8
            )
            if res.returncode != 0:
                return []
            
            output = res.stdout
            aps = self._parse_netsh_output(output)
        except subprocess.TimeoutExpired:
            logger.warning("Windows Wi-Fi scan timed out.")
        except Exception as e:
            logger.error(f"Error executing Windows Wi-Fi scan: {e}")
        return aps

    def _parse_netsh_output(self, text: str) -> List[ScannedAP]:
        """
        Robust bilingual parser for netsh wlan show networks mode=bssid.
        Supports both Spanish and English Windows locales.
        """
        aps: List[ScannedAP] = []
        current_ssid = "<Oculta>"
        current_auth = "WPA2"
        now = time.time()

        # Regular expressions for key fields
        ssid_pattern = re.compile(r"^(?:SSID\s+\d+\s*:\s*)(.*)$", re.IGNORECASE)
        auth_pattern = re.compile(r"^\s*(?:Autenticación|Authentication)\s*:\s*(.*)$", re.IGNORECASE)
        bssid_pattern = re.compile(r"^\s*(?:BSSID\s+\d+\s*:\s*)([0-9a-fA-F:-]{17})", re.IGNORECASE)
        signal_pattern = re.compile(r"^\s*(?:Señal|Signal)\s*:\s*(\d+)%", re.IGNORECASE)
        channel_pattern = re.compile(r"^\s*(?:Canal|Channel)\s*:\s*(\d+)", re.IGNORECASE)
        radio_pattern = re.compile(r"^\s*(?:Tipo de radio|Radio type)\s*:\s*(.*)$", re.IGNORECASE)

        lines = text.splitlines()
        temp_ap: dict = {}

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            # Check new SSID header
            m_ssid = ssid_pattern.match(line)
            if m_ssid:
                current_ssid = m_ssid.group(1).strip()
                if not current_ssid:
                    current_ssid = "<Oculta>"
                continue

            m_auth = auth_pattern.match(line)
            if m_auth:
                current_auth = m_auth.group(1).strip()
                continue

            # Check new BSSID entry
            m_bssid = bssid_pattern.match(line)
            if m_bssid:
                if temp_ap and "bssid" in temp_ap and "channel" in temp_ap:
                    aps.append(self._build_ap_object(temp_ap, now))
                temp_ap = {
                    "ssid": current_ssid,
                    "auth": current_auth,
                    "bssid": m_bssid.group(1).upper(),
                    "quality": 50,
                    "channel": 1,
                    "radio": "802.11"
                }
                continue

            if temp_ap:
                m_sig = signal_pattern.match(line)
                if m_sig:
                    temp_ap["quality"] = int(m_sig.group(1))
                    continue

                m_ch = channel_pattern.match(line)
                if m_ch:
                    temp_ap["channel"] = int(m_ch.group(1))
                    continue

                m_rad = radio_pattern.match(line)
                if m_rad:
                    temp_ap["radio"] = m_rad.group(1).strip()
                    continue

        # Add trailing AP
        if temp_ap and "bssid" in temp_ap and "channel" in temp_ap:
            aps.append(self._build_ap_object(temp_ap, now))

        return aps

    def _build_ap_object(self, raw: dict, timestamp: float) -> ScannedAP:
        channel = int(raw.get("channel", 1))
        quality = int(raw.get("quality", 50))
        rssi = quality_to_rssi(quality)
        freq = channel_to_frequency(channel)
        band = "5GHz" if channel >= 36 else "2.4GHz"
        bssid = raw.get("bssid", "00:00:00:00:00:00")
        vendor = lookup_vendor(bssid)

        return ScannedAP(
            bssid=bssid,
            ssid=raw.get("ssid", "<Oculta>"),
            channel=channel,
            frequency_mhz=freq,
            band=band,
            rssi=rssi,
            signal_quality=quality,
            security=raw.get("auth", "WPA2"),
            channel_width=40 if (band == "5GHz" or "802.11ax" in raw.get("radio", "")) else 20,
            vendor=vendor,
            timestamp=timestamp
        )

    def start(self) -> bool:
        if self.is_running:
            return True
        self._stop_event.clear()
        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="AeroScan-WinCapture")
        self._thread.start()
        logger.info("Windows native capture engine started.")
        return True

    def stop(self) -> None:
        self.is_running = False
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("Windows native capture engine stopped.")

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                aps = self.scan_once()
                if self.callback and aps:
                    self.callback(aps)
            except Exception as e:
                logger.error(f"Error in Windows capture loop: {e}")
            self._stop_event.wait(self.interval)
