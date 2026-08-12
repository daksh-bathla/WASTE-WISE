@echo off
echo Stopping old Node processes on ports 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo.
call "%~dp0verify.cmd"
if errorlevel 1 exit /b 1
echo.
echo Starting backend + frontend...
start "WasteWise Backend" cmd /k "cd /d "%~dp0backend" && node server.js"
timeout /t 3 /nobreak >nul
start "WasteWise Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1"
echo Done. Open http://127.0.0.1:5173 after Vite starts.
pause
