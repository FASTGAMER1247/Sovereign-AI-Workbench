@echo off
setlocal enabledelayedexpansion
title Sovereign AI Workbench
cd /d "%~dp0"

if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" "scripts\launcher.py" %*
) else if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" "scripts\launcher.py" %*
) else (
    python "scripts\launcher.py" %*
)
