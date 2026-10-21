import asyncio
import sys
from pathlib import Path

# Add project root to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.capture.windows_engine import WindowsNativeEngine
from app.main import get_hardware_adapters, startup_event, shutdown_event

async def main():
    print("=" * 60)
    print(" Verificando reconocimiento de módulos Wi-Fi (Hardware)...")
    print("=" * 60)

    engine = WindowsNativeEngine()
    adapters = engine.get_adapters()
    print(f"\n[+] Adaptadores físicos detectados directamente por el motor: {len(adapters)}")
    for ad in adapters:
        print(f"  • ID: {ad.id}")
        print(f"    Nombre: {ad.name}")
        print(f"    Descripción (Hardware): {ad.description}")
        print(f"    Dirección MAC: {ad.mac_address}")
        print(f"    Estado: {ad.status}")
        if ad.connected_ssid:
            print(f"    Enlace actual: SSID={ad.connected_ssid}, Banda={ad.current_band}, Canal={ad.current_channel}")

    print("\n[+] Probando inicialización de la API FastAPI y endpoint /api/hardware/adapters...")
    await startup_event()
    api_result = await get_hardware_adapters()
    print(f"  • Total en API: {api_result['total']}")
    print(f"  • Adaptador seleccionado por defecto: {api_result['selected_adapter']}")
    assert api_result['total'] == len(adapters), "El total de la API no coincide con los adaptadores detectados"

    print("\n[+] Probando escaneo multi-antena / multi-transceptor...")
    scanned_aps = engine.scan_once()
    print(f"  • Total de Redes AP capturadas en el entorno: {len(scanned_aps)}")
    if scanned_aps:
        print("  • Primeros APs detectados:")
        for ap in scanned_aps[:3]:
            print(f"    - SSID: {ap.ssid} | BSSID: {ap.bssid} | Canal: {ap.channel} ({ap.band}) | RSSI: {ap.rssi} dBm | Vía: {ap.adapter_name}")

    await shutdown_event()
    print("\n" + "=" * 60)
    print(" ¡RECONOCIMIENTO DE HARDWARE WIFI VALIDADO CORRECTAMENTE!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
