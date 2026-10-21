@echo off
echo ========================================================
echo   Compilador de AeroScan para Windows (.EXE)
echo ========================================================
echo.

cd /d "%~dp0\.."

echo [*] Verificando dependencias instaladas...
python -m pip install -r requirements.txt

echo.
echo [*] Limpiando compilaciones anteriores...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo.
echo [*] Compilando Frontend React + Vite + Three.js...
cd frontend
call npm run build
cd ..

echo.
echo [*] Compilando AeroScan.exe con PyInstaller...
pyinstaller --clean -y build_scripts\aeroscan.spec

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] La compilacion ha fallado. Revise los mensajes de error.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   [OK] Compilacion Exitosa!
echo   Ejecutable generado en: dist\AeroScan\AeroScan.exe
echo ========================================================
echo.
pause
