@echo off
setlocal enabledelayedexpansion
title Sovereign AI Workbench - Desktop Dependencies Setup
cd /d "%~dp0"

:: Self-elevation: request Administrator privileges if not elevated
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Administrator privileges required for Visual Studio Build Tools installation.
    echo Requesting elevation...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c `\"%~f0`\"' -Verb RunAs"
    exit /b
)

echo ===============================================================================
echo   SOVEREIGN AI WORKBENCH -- DESKTOP BUILD DEPENDENCIES SETUP
echo ===============================================================================
echo.
echo Checking prerequisite build dependencies for native Windows desktop installer...
echo.

:: 1. Check Node.js and npm
where node >nul 2>nul
if errorlevel 1 (
    echo [MISSING] Node.js is not found in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed.
)

:: 2. Check Python virtual environment & PyInstaller
if exist "backend\.venv\Scripts\python.exe" (
    echo [OK] Backend Python virtual environment verified.
    "backend\.venv\Scripts\python.exe" -m pip show pyinstaller >nul 2>nul
    if errorlevel 1 (
        echo [INFO] Installing PyInstaller into backend virtual environment...
        "backend\.venv\Scripts\python.exe" -m pip install pyinstaller
    ) else (
        echo [OK] PyInstaller is ready.
    )
) else (
    echo [WARNING] backend\.venv\Scripts\python.exe not found.
)

:: 3. Check Rust & Cargo
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
    echo [OK] Rust and Cargo toolchain verified.
) else (
    echo [INFO] Installing Rust toolchain via rustup...
    if exist "%TEMP%\rustup-init.exe" (
        "%TEMP%\rustup-init.exe" -y
    ) else (
        curl.exe -sSfL https://win.rustup.rs/x86_64 -o "%TEMP%\rustup-init.exe"
        "%TEMP%\rustup-init.exe" -y
    )
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

:: 4. Check Microsoft Visual Studio C++ Build Tools (MSVC link.exe)
set "MSVC_FOUND=0"

where link >nul 2>nul
if not errorlevel 1 (
    link /? 2>&1 | findstr /i "Microsoft (R) Incremental Linker" >nul 2>nul
    if not errorlevel 1 set "MSVC_FOUND=1"
)

if exist "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" set "MSVC_FOUND=1"
if exist "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" set "MSVC_FOUND=1"
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC" set "MSVC_FOUND=1"
if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Tools\MSVC" set "MSVC_FOUND=1"
if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Tools\MSVC" set "MSVC_FOUND=1"
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC" set "MSVC_FOUND=1"
if exist "C:\Program Files\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC" set "MSVC_FOUND=1"
if exist "C:\Program Files\Microsoft Visual Studio\2019\Community\VC\Tools\MSVC" set "MSVC_FOUND=1"

if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
    "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath >nul 2>nul
    if not errorlevel 1 set "MSVC_FOUND=1"
)

if "%MSVC_FOUND%"=="1" (
    echo [OK] Microsoft Visual Studio C++ Build Tools (MSVC) detected!
) else (
    echo.
    echo ===============================================================================
    echo   ACTION REQUIRED: INSTALL VISUAL STUDIO C++ BUILD TOOLS
    echo ===============================================================================
    echo.
    echo   Tauri requires the MSVC C++ Linker (link.exe) and Windows SDK to compile
    echo   the native Windows desktop executable and setup installer.
    echo.
    set "EXE_PATH=%~dp0vs_BuildTools.exe"
    if not exist "!EXE_PATH!" (
        set "EXE_PATH=%TEMP%\vs_buildtools.exe"
    )
    if not exist "!EXE_PATH!" (
        echo Downloading vs_BuildTools.exe from Microsoft...
        curl.exe -sSfL "https://aka.ms/vs/17/release/vs_buildtools.exe" -o "%~dp0vs_BuildTools.exe"
        set "EXE_PATH=%~dp0vs_BuildTools.exe"
    )

    echo   The Microsoft Visual Studio Build Tools bootstrapper is ready at:
    echo   "!EXE_PATH!"
    echo.
    echo   When you press any key, the installer will launch.
    echo   PLEASE CLICK "YES" ON THE WINDOWS UAC PROMPT to grant administrator access.
    echo ===============================================================================
    echo.
    pause

    echo Launching Visual Studio Build Tools installer...
    echo The installer will now download and install the MSVC C++ compiler and Windows SDK.
    echo Please wait while the installer runs (this may take a few minutes)...
    start /wait "" "!EXE_PATH!" --passive --wait --norestart --nocache --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended
)

echo.
echo ===============================================================================
echo   DEPENDENCIES SETUP COMPLETE!
echo ===============================================================================
echo.
echo You can now run:
echo   1. "Build Installer.bat" to compile the standalone setup installer (.exe).
echo   2. "Launch Desktop.bat"  to run the desktop application in development mode.
echo   3. "Launch Workbench.bat" to run the web application.
echo.
pause
