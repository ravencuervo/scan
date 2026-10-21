# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules, collect_data_files
import os
from pathlib import Path

block_cipher = None
PROJECT_ROOT = Path(SPECPATH).resolve().parent

added_files = [
    (str(PROJECT_ROOT / "app" / "web" / "static"), os.path.join("app", "web", "static")),
    (str(PROJECT_ROOT / "app" / "web" / "templates"), os.path.join("app", "web", "templates")),
    (str(PROJECT_ROOT / "app" / "web" / "dist"), os.path.join("app", "web", "dist")),
]

hidden_imports = [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "fastapi",
    "starlette",
    "starlette.routing",
    "starlette.responses",
    "starlette.middleware",
    "pydantic",
    "reportlab",
    "reportlab.lib",
    "reportlab.platypus",
    "openpyxl",
    "sqlite3",
    "requests",
    "websockets",
    "webview",
    "webview.platforms.winforms",
    "webview.platforms.edgechromium",
    "clr",
    "clr_loader",
    "pythonnet"
]

a = Analysis(
    [str(PROJECT_ROOT / "run.py")],
    pathex=[str(PROJECT_ROOT)],
    binaries=[],
    datas=added_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='AeroScan',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='AeroScan',
)
