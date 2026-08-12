@echo off
echo Starting WasteWise backend...
start "WasteWise Backend" cmd /k "cd /d "%~dp0backend" && node server.js"
timeout /t 3 /nobreak >nul
echo Starting WasteWise frontend...
start "WasteWise Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1"
echo.
echo Backend:  http://127.0.0.1:5000/api/health
echo Frontend: http://127.0.0.1:5173
echo.
pause
