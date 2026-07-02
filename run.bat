@echo off
setlocal enabledelayedexpansion

echo ====================================
echo   Career OS Automated Launcher
echo ====================================
echo.

:: 1. Verify Node and npm are available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [launcher] Error: Node.js was not found. Please install Node.js first.
    pause
    exit /b 1
)

:: 2. Install Node dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [launcher] Installing Node.js dependencies (this may take a moment)...
    call npm install
)

:: 3. Run the automated cross-platform setup (clones sub-repos and configures Python)
echo [launcher] Verifying dependencies and virtual environment...
call node scripts/setup.js --all
if %ERRORLEVEL% neq 0 (
    echo [launcher] Error: Setup script failed.
    pause
    exit /b %ERRORLEVEL%
)

:: 4. Start the development server
echo [launcher] Starting Career OS development server...
call npm run dev
