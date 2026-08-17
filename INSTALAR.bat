@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ====================================================
echo   Instalacion del sistema de comprobantes (una vez)
echo ====================================================
echo.
where py >nul 2>nul
if %errorlevel%==0 (
    py -m pip install --upgrade google-genai pillow
) else (
    python -m pip install --upgrade google-genai pillow
)
echo.
echo Si arriba no aparecio ningun error, la instalacion termino bien.
echo Siguiente paso: abrir config.txt y pegar la clave de API.
echo.
pause
