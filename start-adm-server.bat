@echo off
setlocal
cd /d "%~dp0"
echo.
echo ==========================================
echo   ADM Calculator - Serveur local
echo ==========================================
echo.
echo Ouvrir dans le navigateur:
echo   http://localhost:8080/adm-calculator.html
echo.
echo Pour installation mobile PWA:
echo - Connecte ton telephone et PC au meme Wi-Fi
echo - Sur PC, trouve l'IP locale avec: ipconfig
echo - Sur telephone, ouvre:
echo   http://IP_DU_PC:8080/adm-calculator.html
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur.
echo.
node .\\serve-local.js
endlocal
