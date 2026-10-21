import subprocess
import re
import time
import threading
import logging
from typing import List, Optional, Callable
from app.capture.hal import (
    BaseCaptureEngine,
    ScannedAP,
    WirelessAdapter,
    channel_to_frequency,
    quality_to_rssi,
    lookup_vendor
)

logger = logging.getLogger("aeroscan.capture.windows")

class WindowsNativeEngine(BaseCaptureEngine):
    """
    Windows Native Wi-Fi Capture Engine.
    Uses Windows WLAN API and Netsh BSSID enumeration to capture Wi-Fi APs
    across all detected Wi-Fi hardware modules (Internal PCIe, External USB adapters).
    """

    def __init__(self, callback: Optional[Callable[[List[ScannedAP]], None]] = None, interval: float = 3.0):
        super().__init__(callback)
        self.interval = interval
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.selected_adapter: str = "ALL"

    def get_adapters(self) -> List[WirelessAdapter]:
        """
        Enumerate all physical and virtual Wi-Fi hardware interfaces on the Windows system.
        Supports single or multi-adapter configurations (Internal PCIe + External USB).
        """
        adapters: List[WirelessAdapter] = []
        try:
            res = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True,
                text=True,
                encoding="latin-1",
                timeout=6
            )
            if res.returncode != 0:
                return adapters

            text = res.stdout
            matches = list(re.finditer(r"^\s*(?:Nombre|Name)\s*:\s*(.+)$", text, re.MULTILINE | re.IGNORECASE))
            for i, m in enumerate(matches):
                start = m.start()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
                block = text[start:end]
                name = m.group(1).strip()

                desc_m = re.search(r"^\s*(?:Descrip\w+|Description)\s*:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
                guid_m = re.search(r"^\s*GUID\s*:\s*([0-9a-fA-F-]+)", block, re.MULTILINE | re.IGNORECASE)
                mac_m = re.search(r"^\s*(?:Direc\w+|Physical address)\s*:\s*([0-9a-fA-F:-]{17})", block, re.MULTILINE | re.IGNORECASE)
                state_m = re.search(r"^\s*(?:Estado|State)\s*:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
                ssid_m = re.search(r"^\s*SSID\s*:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
                bssid_m = re.search(r"^\s*(?:AP\s+BSSID|BSSID)\s*:\s*([0-9a-fA-F:-]{17})", block, re.MULTILINE | re.IGNORECASE)
                band_m = re.search(r"^\s*(?:Banda|Band)\s*:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)
                channel_m = re.search(r"^\s*(?:Canal|Channel)\s*:\s*(\d+)", block, re.MULTILINE | re.IGNORECASE)
                radio_m = re.search(r"^\s*(?:Tipo de radio|Radio type)\s*:\s*(.+)$", block, re.MULTILINE | re.IGNORECASE)

                status_raw = state_m.group(1).strip().lower() if state_m else "desconocido"
                status = "connected" if "conectado" in status_raw or "connected" in status_raw else "disconnected"

                adapters.append(WirelessAdapter(
                    id=name,
                    name=name,
                    description=desc_m.group(1).strip() if desc_m else "Adaptador Wi-Fi Genérico",
                    mac_address=mac_m.group(1).strip().upper() if mac_m else "",
                    guid=guid_m.group(1).strip() if guid_m else "",
                    status=status,
                    connected_ssid=ssid_m.group(1).strip() if ssid_m else None,
                    connected_bssid=bssid_m.group(1).strip().upper() if bssid_m else None,
                    current_band=band_m.group(1).strip() if band_m else None,
                    current_channel=int(channel_m.group(1)) if channel_m else None,
                    radio_type=radio_m.group(1).strip() if radio_m else None,
                    is_physical=True
                ))
        except Exception as e:
            logger.warning(f"Error enumerating wireless adapters: {e}")

        return adapters

    def is_hardware_available(self) -> bool:
        """Check if at least one wireless adapter exists."""
        return len(self.get_adapters()) > 0

    def set_active_adapter(self, adapter_id: Optional[str]) -> None:
        """Set active adapter ('ALL' or adapter name)."""
        self.selected_adapter = adapter_id or "ALL"
        logger.info(f"Active Wi-Fi capture adapter changed to: {self.selected_adapter}")

    def scan_once(self, interface: Optional[str] = None) -> List[ScannedAP]:
        """
        Execute netsh wlan show networks mode=bssid.
        If a specific adapter is chosen, scan through that interface.
        If 'ALL', scan across all detected adapters and merge results.
        """
        target = interface or self.selected_adapter or "ALL"

        if target != "ALL":
            return self._scan_single_interface(target)

        # Multi-adapter scan: scan all available interfaces and aggregate
        adapters = self.get_adapters()
        if not adapters:
            return self._scan_single_interface(None)

        merged_aps: dict = {}
        for adapter in adapters:
            aps = self._scan_single_interface(adapter.name)
            for ap in aps:
                if ap.bssid not in merged_aps or ap.signal_quality > merged_aps[ap.bssid].signal_quality:
                    merged_aps[ap.bssid] = ap

        return list(merged_aps.values())

    def _scan_single_interface(self, iface_name: Optional[str]) -> List[ScannedAP]:
        """Execute netsh scan on a specific interface or system default."""
        aps: List[ScannedAP] = []
        cmd = ["netsh", "wlan", "show", "networks", "mode=bssid"]
        if iface_name and iface_name != "ALL":
            cmd = ["netsh", "wlan", "show", "networks", f"interface={iface_name}", "mode=bssid"]

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                timeout=8
            )
            if res.returncode == 0 and res.stdout:
                text = ""
                for enc in ("utf-8", "cp1252", "cp850", "latin-1"):
                    try:
                        text = res.stdout.decode(enc)
                        break
                    except (UnicodeDecodeError, LookupError):
                        continue
                if not text:
                    text = res.stdout.decode("utf-8", errors="replace")
                aps = self._parse_netsh_output(text, adapter_name=iface_name)
        except subprocess.TimeoutExpired:
            logger.warning(f"Wi-Fi scan timed out on interface {iface_name or 'default'}")
        except Exception as e:
            logger.error(f"Error executing Wi-Fi scan on {iface_name or 'default'}: {e}")

        return aps

    def _parse_netsh_output(self, text: str, adapter_name: Optional[str] = None) -> List[ScannedAP]:
        """
        Robust bilingual parser for netsh wlan show networks mode=bssid.
        Supports both Spanish and English Windows locales.
        """
        aps: List[ScannedAP] = []
        current_ssid = "<Oculta>"
        current_auth = "WPA2"
        now = time.time()

        # Regular expressions for key fields with flexible accent handling
        ssid_pattern = re.compile(r"^(?:SSID\s+\d+\s*:\s*)(.*)$", re.IGNORECASE)
        auth_pattern = re.compile(r"^\s*(?:Autentic[aá\w\ufffd]+n|Authentication)\s*:\s*(.*)$", re.IGNORECASE)
        bssid_pattern = re.compile(r"^\s*(?:BSSID\s+\d+\s*:\s*)([0-9a-fA-F:-]{17})", re.IGNORECASE)
        signal_pattern = re.compile(r"(?:Se[^\s:]*al|Signal)\s*:\s*(\d+)\s*%", re.IGNORECASE)
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
                    aps.append(self._build_ap_object(temp_ap, now, adapter_name))
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
                m_sig = signal_pattern.search(line)
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
            aps.append(self._build_ap_object(temp_ap, now, adapter_name))

        return aps

    def _build_ap_object(self, raw: dict, timestamp: float, adapter_name: Optional[str] = None) -> ScannedAP:
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
            timestamp=timestamp,
            adapter_name=adapter_name
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
