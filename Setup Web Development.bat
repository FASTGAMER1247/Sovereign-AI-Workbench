@echo off
setlocal enabledelayedexpansion
title Sovereign AI Workbench - Web Development Setup
cd /d "%~dp0"

echo ===============================================================================
echo  SOVEREIGN AI WORKBENCH — FIRST-TIME WEB DEVELOPMENT SETUP
echo ===============================================================================
echo  This utility checks and configures:
echo   1. Python 3.10+ and backend virtual environment (.venv)
echo   2. Backend dependencies (FastAPI, ChromaDB, PyMuPDF, python-docx)
echo   3. Node.js, npm, and frontend dependencies
echo   4. Local Ollama inference service and required models
echo   5. Air-gap sandbox isolation capabilities
echo ===============================================================================
echo.

:: Detect Python
where python >nul 2>nul
if not errorlevel 1 (
    python "scripts\setup_web_dev.py" %*
) else if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" "scripts\setup_web_dev.py" %*
) else (
    echo [ERROR] Python 3.10+ was not found in your system PATH.
    echo Please install Python from https://www.python.org/downloads/
    echo (Make sure to check "Add Python to PATH" during installation)
    echo.
    pause
    exit /b 1
)

echo.
echo Press any key to close setup...
pause >nul
