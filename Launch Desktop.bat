@echo off
setlocal enabledelayedexpansion
title Sovereign AI Workbench - Desktop [Development Mode]
cd /d "%~dp0"

echo ===============================================================================
echo  Sovereign AI Workbench - Native Desktop [DEVELOPMENT LAUNCHER]
echo ===============================================================================
echo  [DEVELOPER NOTICE]
echo  * This launcher runs the desktop application in Tauri Development Mode.
echo  * It spawns the Vite dev server and links the native Tauri 2 desktop shell.
echo  * It automatically manages the local Python FastAPI backend.
echo  * For standalone end-user deployment, use the production Setup installer.
echo ===============================================================================
echo.

:: Ensure Rust Cargo toolchain is accessible from current session
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

where cargo >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Rust toolchain (cargo) not found in PATH or %USERPROFILE%\.cargo\bin.
    echo Please install Rust or verify cargo.exe exists.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js / npm not found in PATH.
    echo Please ensure Node.js is installed.
    echo.
    pause
    exit /b 1
)

cd frontend
echo Starting Tauri development desktop session...
call npm run desktop

if errorlevel 1 (
    echo.
    echo [ERROR] Tauri development session exited with an error.
    pause
)
