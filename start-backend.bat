@echo off
cd /d "%~dp0backend"
echo Starting backend in new terminal...
start "Backend" cmd /k "npm start"
exit /b 0
