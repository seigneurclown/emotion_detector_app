@echo off
title Emotion Recognition App Launcher
echo ========================================================
echo   FACIAL EMOTION RECOGNITION & ANALYTICS APP
echo ========================================================
echo 1. Dang khoi dong Flask AI Server (:5000)...
start "AI Flask Server (:5000)" cmd /k "cd /d "%~dp0" && .\.venv\Scripts\python app.py"

echo 2. Dang khoi dong Web Frontend (:3000) va Backend (:5001)...
start "React Frontend & Auth (:3000, :5001)" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ========================================================
echo He thong da khoi dong xong!
echo Mo trinh duyet tai: http://localhost:3000
echo ========================================================
timeout /t 3 >nul
start http://localhost:3000
