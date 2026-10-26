@echo off
title ApexDrive - Performance Auto Parts Operations Deck
color 0B

echo ======================================================================
echo    APEXDRIVE - PERFORMANCE AUTO PARTS & OPERATIONS TELEMETRY DECK
echo ======================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js was not detected in your system PATH.
    echo Please download and install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Check Dependencies
if not exist "node_modules\" (
    echo [*] First-time setup: Installing required dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [!] npm install encountered an error.
        pause
        exit /b 1
    )
)

:: 3. Launch Browser and Server
echo [*] Launching ApexDrive Dashboard at http://localhost:3000 ...
start "" "http://localhost:3000"

echo [*] Starting Telemetry Engine (Node.js Server)...
echo [*] Press Ctrl+C in this terminal anytime to stop the server.
echo.
node server.js

pause
