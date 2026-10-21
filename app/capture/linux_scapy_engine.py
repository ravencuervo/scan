import time
import os
import sys
import threading
import logging
import subprocess
from typing import List, Optional, Callable, Dict, Any
from app.capture.hal import BaseCaptureEngine, ScannedAP, channel_to_frequency, rssi_to_quality, lookup_vendor
from app.core.config import CHANNELS_24_GHZ

logger = logging.getLogger("aeroscan.capture.scapy")

class LinuxScapyMonitorEngine(BaseCaptureEngine):
    """
    Linux / WSL2 Raw 802.11 Monitor Mode Engine using Scapy and Channel Hopping.
    Captures Beacon and Probe Response frames directly from radio hardware.
    """

    def __init__(self, interface: str = "wlan0mon", callback: Optional[Callable[[List[ScannedAP]], None]] = None):
        super().__init__(callback)
        self.interface = interface
        self._thread: Optional[threading.Thread] = None
        self._hopper_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._detected_aps: Dict[str, ScannedAP] = {}
        self._lock = threading.Lock()

    def is_hardware_available(self) -> bool:
        """Check if running on Linux/WSL and wireless interface exists."""
        if not sys.platform.startswith("linux"):
            return False
        # Check if interface exists in sysfs
        return os.path.exists(f"/sys/class/net/{self.interface}")

    def _hop_channels(self) -> None:
        """Cycle through channels periodically to capture frames across the entire spectrum."""
        channels = [1, 6, 11, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 36, 40, 44, 48, 149, 153, 157, 161]
        while not self._stop_event.is_set():
            for ch in channels:
                if self._stop_event.is_set():
                    break
                try:
                    subprocess.run(
                        ["iw", "dev", self.interface, "set", "channel", str(ch)],
                        capture_output=True,
                        check=False
                    )
                except Exception:
                    pass
                time.sleep(0.35)

    def _packet_handler(self, pkt: Any) -> None:
        """Process sniffed 802.11 frame."""
        try:
            # Check for Scapy 802.11 Dot11 layer
            if not pkt.haslayer("Dot11Beacon") and not pkt.haslayer("Dot11ProbeResp"):
                return

            dot11 = pkt.getlayer("Dot11")
            bssid = dot11.addr2.upper() if dot11.addr2 else "00:00:00:00:00:00"

            # Extract SSID
            ssid = "<Oculta>"
            try:
                raw_ssid = pkt.info.decode("utf-8", errors="ignore")
                if raw_ssid:
                    ssid = raw_ssid
            except Exception:
                pass

            # Extract Signal Strength (RSSI from RadioTap header)
            rssi = -75
            if pkt.haslayer("RadioTap"):
                rt = pkt.getlayer("RadioTap")
                if hasattr(rt, "dBm_AntSignal"):
                    rssi = int(rt.dBm_AntSignal)

            # Extract Channel
            channel = 1
            elt = pkt.getlayer("Dot11Elt")
            while elt:
                if elt.ID == 3 and len(elt.info) >= 1:
                    channel = ord(elt.info[0:1])
                    break
                elt = elt.payload.getlayer("Dot11Elt")

            # Extract Security capabilities
            cap = pkt.sprintf("{Dot11Beacon:%Dot11Beacon.cap%}")
            security = "Abierto"
            if "privacy" in cap:
                if pkt.haslayer("Dot11EltRSN"):
                    security = "WPA2/WPA3"
                else:
                    security = "WPA"

            band = "5GHz" if channel >= 36 else "2.4GHz"
            now = time.time()
            vendor = lookup_vendor(bssid)

            scanned = ScannedAP(
                bssid=bssid,
                ssid=ssid,
                channel=channel,
                frequency_mhz=channel_to_frequency(channel),
                band=band,
                rssi=rssi,
                signal_quality=rssi_to_quality(rssi),
                security=security,
                channel_width=20,
                vendor=vendor,
                timestamp=now
            )

            with self._lock:
                self._detected_aps[bssid] = scanned

        except Exception as e:
            logger.debug(f"Error parsing 802.11 frame: {e}")

    def scan_once(self) -> List[ScannedAP]:
        with self._lock:
            return list(self._detected_aps.values())

    def start(self) -> bool:
        if not self.is_hardware_available():
            logger.warning("Linux/WSL Scapy monitor hardware is not available on this platform.")
            return False

        try:
            from scapy.all import sniff
        except ImportError:
            logger.error("Scapy library is not installed in the Linux/WSL environment.")
            return False

        if self.is_running:
            return True

        self._stop_event.clear()
        self.is_running = True

        # Start channel hopper
        self._hopper_thread = threading.Thread(target=self._hop_channels, daemon=True, name="AeroScan-ScapyHopper")
        self._hopper_thread.start()

        # Start sniffer thread
        def sniffer_loop():
            from scapy.all import sniff
            while not self._stop_event.is_set():
                sniff(
                    iface=self.interface,
                    prn=self._packet_handler,
                    store=False,
                    timeout=2.0
                )
                if self.callback:
                    with self._lock:
                        current_list = list(self._detected_aps.values())
                    if current_list:
                        self.callback(current_list)

        self._thread = threading.Thread(target=sniffer_loop, daemon=True, name="AeroScan-ScapySniffer")
        self._thread.start()
        logger.info(f"Scapy monitor capture started on interface {self.interface}.")
        return True

    def stop(self) -> None:
        self.is_running = False
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        if self._hopper_thread and self._hopper_thread.is_alive():
            self._hopper_thread.join(timeout=2.0)
        logger.info("Scapy monitor capture stopped.")
