@echo off
set "ROOT_DIR=%~dp0"
start "Admin" "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --new-window "%ROOT_DIR%admin.html"
exit /b 0
