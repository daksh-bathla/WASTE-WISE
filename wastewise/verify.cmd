@echo off
cd /d "%~dp0backend"
echo Running WasteWise verification...
"C:\Program Files\nodejs\node.exe" run-verify.js
if errorlevel 1 (
  echo Verification failed.
  exit /b 1
)
echo Verification passed.
exit /b 0
