@echo off
setlocal EnableExtensions

REM One-click launcher for Windows users.
REM 1) Prefer packaged app: dist\win-unpacked\OpenWhispr.exe
REM 2) Fallback to source mode: npm start (hidden/minimized by VBS wrapper)

set "ROOT_DIR=%~dp0.."
for %%I in ("%ROOT_DIR%") do set "ROOT_DIR=%%~fI"

set "PACKAGED_EXE=%ROOT_DIR%\dist\win-unpacked\OpenWhispr.exe"

if exist "%PACKAGED_EXE%" (
  start "VoiceInk" "%PACKAGED_EXE%"
  exit /b 0
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [VoiceInk Launcher] npm not found in PATH.
  echo Please install Node.js and run npm install first.
  timeout /t 5 >nul
  exit /b 1
)

start "VoiceInk (Source)" /min cmd /c "cd /d \"%ROOT_DIR%\" && npm start"
exit /b 0
