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

:: Ensure Rust Cargo toolchain is accessible from current session
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

:: Detect and activate Visual Studio C++ build environment if not already active
where link >nul 2>nul
if errorlevel 1 (
    if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles%\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat"
    )
)

:: Verify link.exe is available before starting build
where link >nul 2>nul
if errorlevel 1 (
    echo.
    echo ===============================================================================
    echo   [ERROR] Visual Studio C++ Linker [link.exe] Not Found!
    echo ===============================================================================
    echo   Tauri requires the MSVC C++ Build Tools and Windows SDK to compile
    echo   the native Windows desktop executable and setup installer.
    echo.
    echo   Please run "Install Desktop Dependencies.bat" to install the required
    echo   build tools, then rerun this script.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

:: Ensure backend virtual environment python is preferred
if exist "backend\.venv\Scripts\python.exe" (
    set "PY_CMD=backend\.venv\Scripts\python.exe"
) else (
    set "PY_CMD=python"
)

echo [1/3] Compiling and verifying backend binaries...
%PY_CMD% scripts/package_backend.py --skip-if-exists
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend packaging failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Building Tauri production installer...
cd frontend
call npm.cmd run desktop:build
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
