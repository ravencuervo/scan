# AeroScan — Sistema de Captura y Análisis del Espectro Radioeléctrico WiFi

**Diseño e implementación de un software para la captura y análisis del espectro radioeléctrico en redes inalámbricas WiFi orientado al diagnóstico de ingeniería de redes.**

*Universidad Nacional del Altiplano — Facultad de Ingeniería Estadística e Informática*

---

## 👥 Integrantes del Proyecto
- Benito Anchapuri Leydy Meliza
- Gómez Cahuana Jerson Romario
- Mamani Emanuel Edilberto Wilson
- Quispe Cruz Joel Antoni
- Peralta Lopez Etzel Yuliza

---

## 🚀 Características Principales

1. **Arquitectura Multi-Motor (HAL - Hardware Abstraction Layer)**:
   - **Motor Windows Nativo**: Captura APs (BSSID, SSID, Canal, Frecuencia, RSSI en dBm, Cifrado, Ancho) en cualquier laptop Windows sin hardware externo ni drivers adicionales.
   - **Motor Linux / WSL2 Scapy**: Captura tramas brutas 802.11 (Beacon, Probe Request) con salto de canales (*channel hopping*) usando adaptadores en modo monitor.
   - **Simulador de Espectro RF**: Simulación matemática con modelos de propagación RF y desvanecimiento multicamino (*multipath fading*) para pruebas de laboratorio y demostraciones académicas.
2. **Cálculo Riguroso de Métricas de Ingeniería**:
   - **Interferencia Co-Canal (CCI)**: Cálculo logarítmico y lineal de potencia interferente en canales compartidos.
   - **Interferencia de Canal Adyacente (ACI)**: Modelo de solapamiento espectral de máscaras OFDM en 2.4 GHz ($W(\Delta f)$) y penalización de colisiones CRC.
   - **Densidad de APs y Salud de Canal (0 - 100%)**: Cuantificación de saturación espectral.
   - **Algoritmo de Optimización**: Selección automática del canal óptimo en 2.4 GHz (1, 6, 11) y en 5 GHz.
3. **Persistencia Local con SQLite (`aeroscan.db`)**:
   - Almacenamiento histórico de sesiones, muestras de RSSI, catálogos de fabricantes (OUI) y reportes con modo WAL (*Write-Ahead Logging*).
4. **Dashboard Web Interactivo en Tiempo Real**:
   - Gráficos de campanas parabólicas espectrales en 2.4 GHz y bloques en 5 GHz sobre HTML5 Canvas acelerado.
   - Espectrograma en cascada (*waterfall*) tipo mapa de calor.
   - Transmisión continua por **WebSockets**.
5. **Generación Automática de Reportes**:
   - **PDF Técnico Formal**: Con resumen ejecutivo, matrices de interferencia, inventario y recomendaciones de mitigación.
   - **Excel (.xlsx)**: Con hojas detalladas de datos crudos, análisis espectral y KPIs.
6. **Empaquetado Portable en `.EXE`**:
   - Compilable en un solo archivo ejecutable para Windows mediante PyInstaller.

---

## 📁 Estructura del Código

```text
aeroscan/
├── app/
│   ├── main.py                     # API FastAPI, WebSockets y Desktop Launcher
│   ├── core/
│   │   ├── config.py               # Constantes RF, umbrales y rutas
│   │   └── database.py             # Capa SQLite y modelos de persistencia
│   ├── capture/
│   │   ├── hal.py                  # Interfaz común y conversor OUI/frecuencias
│   │   ├── windows_engine.py       # Captura nativa Windows (WLAN API / Netsh)
│   │   ├── simulation_engine.py    # Generador/simulador de telemetría RF
│   │   └── linux_scapy_engine.py   # Motor Scapy 802.11 monitor mode para WSL/Linux
│   ├── analysis/
│   │   ├── metrics.py              # Cálculo de CCI, ACI, solapamiento y salud
│   │   └── optimizer.py            # Recomendación de canal óptimo y diagnósticos
│   ├── reports/
│   │   ├── pdf_generator.py        # Generador de informes PDF formales
│   │   └── excel_exporter.py       # Exportador de libros de cálculo Excel (.xlsx)
│   └── web/
│       ├── static/
│       │   ├── css/dashboard.css   # Estilo táctico oscuro (Dark Spectrum UI)
│       │   └── js/app.js           # Renderizador Canvas y cliente WebSocket
│       └── templates/index.html    # Dashboard web interactivo SPA
├── build_scripts/
│   ├── aeroscan.spec               # Especificación de empaquetado PyInstaller
│   └── build_exe.bat               # Compilador a .EXE en un clic
├── tests/
│   └── test_system.py              # Suite de pruebas automatizadas
├── run.py                          # Lanzador de escritorio para Windows
├── run_wsl.sh                      # Lanzador para Linux y WSL2
└── requirements.txt                # Dependencias Python
```

---

## ⚡ Guía de Instalación y Uso

### 1. Ejecutar en Modo Desarrollo (Windows)
```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar la suite de pruebas
python tests/test_system.py

# 3. Iniciar AeroScan
python run.py
```
*El sistema abrirá automáticamente su navegador en `http://127.0.0.1:8765`.*

### 2. Compilar el `.EXE` Autónomo para Windows
Hacer doble clic sobre el archivo `build_scripts\build_exe.bat` o ejecutar en consola:
```bash
pyinstaller --clean build_scripts/aeroscan.spec
```
El archivo ejecutable compilado se ubicará en:
`dist\AeroScan\AeroScan.exe`

### 3. Ejecutar en WSL2 / Linux
```bash
chmod +x run_wsl.sh
sudo ./run_wsl.sh
```

---

## 📊 Endpoints de la API REST

- `GET /api/status`: Estado del servicio, motor de captura y total de APs.
- `POST /api/session/start`: Inicia una nueva sesión de auditoría (`windows`, `simulation` o `scapy_wsl`).
- `POST /api/session/stop`: Detiene la sesión actual.
- `GET /api/metrics/current`: Retorna métricas de canales y recomendaciones en formato JSON.
- `POST /api/reports/pdf`: Genera y descarga el informe técnico en PDF.
- `POST /api/reports/excel`: Genera y descarga el libro de datos en Excel.
- `WS /ws/spectrum`: Flujo continuo de telemetría a 60 FPS hacia el frontend.
