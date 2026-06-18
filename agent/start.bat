@echo off
chcp 65001 >nul
title NEXA Photo Agent

echo ╔══════════════════════════════════════╗
echo ║     NEXA Photo Agent - Baslatiliyor ║
echo ╚══════════════════════════════════════╝
echo.

REM Check if config exists
if not exist "%~dp0nexa-config.txt" (
    echo [HATA] nexa-config.txt bulunamadi!
    echo.
    echo Asagidaki dosyayi olusturun:
    echo   NEXA_URL=https://sunucu-adresiniz.com
    echo   NEXA_TOKEN=jwt-token-buraya
    echo   WATCH_FOLDER=C:\NexaPhotos
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists, if not install
if not exist "%~dp0node_modules" (
    echo [INFO] Bagimliliklar yukleniyor...
    cd /d "%~dp0"
    call npm install
)

REM Start agent
echo [INFO] Agent baslatiliyor...
cd /d "%~dp0"
node photo-agent.js

pause
