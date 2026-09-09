@echo off
setlocal enabledelayedexpansion
title Sovereign AI Workbench - Desktop Development Setup
cd /d "%~dp0"

echo ===============================================================================
echo  SOVEREIGN AI WORKBENCH — FIRST-TIME TAURI DESKTOP DEVELOPMENT SETUP
echo ===============================================================================
echo  This utility checks and configures:
echo   1. Python 3.10+ and backend virtual environment (.venv)
echo   2. Backend dependencies (FastAPI, ChromaDB, PyMuPDF, python-docx)
echo   3. Node.js, npm, and frontend dependencies
echo   4. Rust compiler (rustc) and Cargo package manager
echo   5. Microsoft C++ Build Tools (MSVC)
echo   6. Tauri 2 desktop framework and compiled crates
echo   7. Local Ollama inference service and required models
echo ===============================================================================
echo.

:: Prepend cargo to PATH if present in user profile
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

:: Detect Python
where python >nul 2>nul
if not errorlevel 1 (
    python "scripts\setup_desktop_dev.py" %*
) else if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" "scripts\setup_desktop_dev.py" %*
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
