@echo off
setlocal enabledelayedexpansion
title Sovereign AI Workbench
cd /d "%~dp0"

echo ================================================================
echo  Launching Sovereign AI Workbench...
echo ================================================================

if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" "scripts\launcher.py" %*
) else if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" "scripts\launcher.py" %*
) else (
    python "scripts\launcher.py" %*
)

if errorlevel 1 (
    echo.
    echo [ERROR] Launcher encountered an issue. Press any key to close.
    pause >nul
)
