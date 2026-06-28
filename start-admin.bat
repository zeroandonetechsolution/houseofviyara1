@echo off
set "ROOT_DIR=%~dp0"
set "ADMIN_URL=http://127.0.0.1:5501/admin.html"

powershell -Command "try { Invoke-WebRequest -Uri '%ADMIN_URL%' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if %ERRORLEVEL%==0 (
    start "Admin" "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --new-window "%ADMIN_URL%"
) else (
    start "Admin" "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --new-window "%ROOT_DIR%admin.html"
)
exit /b 0
