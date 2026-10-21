import logging
from typing import Optional, Callable, List
from app.capture.hal import BaseCaptureEngine, ScannedAP
from app.capture.windows_engine import WindowsNativeEngine
from app.capture.simulation_engine import SimulationEngine
from app.capture.linux_scapy_engine import LinuxScapyMonitorEngine

logger = logging.getLogger("aeroscan.capture")

def create_capture_engine(
    engine_type: str = "auto",
    callback: Optional[Callable[[List[ScannedAP]], None]] = None
) -> BaseCaptureEngine:
    """
    Factory to instantiate the appropriate capture engine based on configuration
    and detected operating system / hardware availability.
    """
    engine_type = engine_type.lower()

    if engine_type == "simulation":
        return SimulationEngine(callback=callback)

    if engine_type == "scapy_wsl":
        scapy_engine = LinuxScapyMonitorEngine(callback=callback)
        if scapy_engine.is_hardware_available():
            return scapy_engine
        logger.warning("Scapy/WSL monitor hardware not detected. Falling back to simulation.")
        return SimulationEngine(callback=callback)

    if engine_type == "windows":
        win_engine = WindowsNativeEngine(callback=callback)
        if win_engine.is_hardware_available():
            return win_engine
        logger.warning("Windows Wi-Fi interface not active. Falling back to simulation.")
        return SimulationEngine(callback=callback)

    # Auto-detection
    win_engine = WindowsNativeEngine(callback=callback)
    if win_engine.is_hardware_available():
        logger.info("Auto-detected Windows Wi-Fi adapter. Using WindowsNativeEngine.")
        return win_engine

    scapy_engine = LinuxScapyMonitorEngine(callback=callback)
    if scapy_engine.is_hardware_available():
        logger.info("Auto-detected Linux/WSL monitor interface. Using LinuxScapyMonitorEngine.")
        return scapy_engine

    logger.info("No physical wireless adapter found. Using SimulationEngine.")
    return SimulationEngine(callback=callback)
