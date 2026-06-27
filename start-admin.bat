@echo off
SET ROOT_DIR=%~dp0
start "Admin" "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --new-window "http://127.0.0.1:3000/admin.html"
exit /b 0
