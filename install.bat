@echo off
cd /d %~dp0
echo ========================================
echo  Advanced Chess Platform - Installer
echo ========================================
echo.

REM Launch PowerShell script with admin privileges
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& {Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0install.ps1""' -Verb RunAs}"

echo.
echo Installation script launched!
echo Please check the PowerShell window for progress.
echo.
pause
