import os
import sys
import time
import threading
import requests
import uvicorn
import multiprocessing
import webview

from app.core.config import SERVER_HOST, SERVER_PORT
from app.main import app

def start_server():
    """Start uvicorn server in a separate thread."""
    config = uvicorn.Config(
        app,
        host=SERVER_HOST,
        port=SERVER_PORT,
        log_level="warning",
        access_log=False
    )
    server = uvicorn.Server(config)
    server.run()

def wait_for_server(url: str, timeout: float = 20.0) -> bool:
    """Poll until server responds with 200 OK."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{url}/api/status", timeout=0.5)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.2)
    return False

def main():
    multiprocessing.freeze_support()
    print("=" * 65)
    print("   AEROSCAN — Aplicación de Escritorio (Desktop App)")
    print("   Universidad Nacional del Altiplano - Informática")
    print("=" * 65)

    url = f"http://{SERVER_HOST}:{SERVER_PORT}"

    # Start FastAPI server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    print(f"[*] Esperando inicialización del núcleo en {url}...")
    if not wait_for_server(url):
        print("[!] Advertencia: Tiempo de espera agotado esperando el servidor.")

    print("[*] Abriendo ventana de escritorio nativa de AeroScan...")
    
    try:
        # Create native Windows Desktop Window with Edge Chromium Webview
        window = webview.create_window(
            title="AeroScan — Análisis y Diagnóstico del Espectro Radioeléctrico WiFi",
            url=url,
            width=1380,
            height=880,
            min_size=(1024, 680),
            background_color="#0a0e17",
            confirm_close=False
        )
        webview.start(gui="edgechromium", debug=False)
    except Exception as e:
        print(f"[!] Modo nativo no disponible ({e}). Abriendo en navegador...")
        import webbrowser
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

    print("[*] AeroScan finalizado correctamente.")
    sys.exit(0)

if __name__ == "__main__":
    main()
