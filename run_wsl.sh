#!/bin/bash
# Script de inicio para AeroScan en Linux y WSL2 (Windows Subsystem for Linux)
echo "=========================================================="
echo "   Iniciando AeroScan en entorno Linux / WSL"
echo "=========================================================="

# Comprobar si se ejecuta con permisos de root (requerido para Scapy en modo monitor)
if [ "$EUID" -ne 0 ]; then
  echo "[!] Nota: Para captura con Scapy en modo monitor se recomienda sudo."
fi

# Instalar dependencias si no estan presentes
pip install -r requirements.txt

# Iniciar servidor
python3 run.py
