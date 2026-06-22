@echo off
chcp 65001 >nul
title Espo Deploy Console
echo.
echo   Avvio Deploy Console...
echo   Si aprira' nel browser su http://127.0.0.1:4599
echo   (lascia questa finestra aperta; Ctrl+C per chiudere)
echo.
node "%~dp0scripts\deploy-ui\server.js"
echo.
echo   Deploy Console chiusa.
pause
