@echo off
cd /d "%~dp0"
echo Starting local web server on port 5501...
start "House Of Viyara Server" cmd /k "python -m http.server 5501"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5501/index.html"
start "" "http://127.0.0.1:5501/admin.html"
exit /b 0
