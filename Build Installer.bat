@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo   SOVEREIGN AI WORKBENCH -- PRODUCTION INSTALLER BUILDER
echo ===============================================================================
echo.
echo This script compiles and packages the complete production desktop installer:
echo   1. Standalone Python backend (sovereign-backend.exe)
echo   2. Standalone AST Sandbox runner (sovereign-sandbox-runner.exe)
echo   3. Production React UI bundle
echo   4. Tauri Rust desktop application and NSIS Windows installer
echo.

cd /d "%~dp0"

echo [1/3] Compiling backend and sandbox binaries...
python scripts/package_backend.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend packaging failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Building Tauri production installer...
cd frontend
call npm run desktop:build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Tauri desktop build failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [3/3] Copying output installer to release folder...
if not exist "release" mkdir "release"
if exist "frontend\src-tauri\target\release\bundle\nsis\Sovereign AI Workbench_0.1.0_x64-setup.exe" (
    copy /y "frontend\src-tauri\target\release\bundle\nsis\Sovereign AI Workbench_0.1.0_x64-setup.exe" "release\Sovereign AI Workbench Setup.exe" >nul
)
if exist "frontend\src-tauri\target\release\bundle\msi\Sovereign AI Workbench_0.1.0_x64_en-US.msi" (
    copy /y "frontend\src-tauri\target\release\bundle\msi\Sovereign AI Workbench_0.1.0_x64_en-US.msi" "release\Sovereign AI Workbench Setup.msi" >nul
)

echo.
echo ===============================================================================
echo   INSTALLER BUILD COMPLETE!
echo   Location: %~dp0release\Sovereign AI Workbench Setup.exe
echo ===============================================================================
echo.
pause
