@echo off
chcp 65001 >nul
cd /d "%~dp0"
setlocal

set "CARPETA=Extractor Comprobantes"
set "EXE=dist\Extractor Comprobantes.exe"

echo ====================================================
echo   Empaquetador - Extractor Comprobantes
echo ====================================================
echo.
echo [1/3] Compilando el ejecutable con PyInstaller...
echo.
python build.py
if errorlevel 1 (
    echo.
    echo ERROR: el build fallo. Revisa los mensajes de arriba.
    echo No se creo la carpeta "%CARPETA%".
    echo.
    pause
    exit /b 1
)
if not exist "%EXE%" (
    echo.
    echo ERROR: no se encontro "%EXE%" despues del build.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Preparando la carpeta "%CARPETA%"...
if exist "%CARPETA%" rmdir /s /q "%CARPETA%"
mkdir "%CARPETA%"
mkdir "%CARPETA%\entrada"
mkdir "%CARPETA%\procesados"
mkdir "%CARPETA%\revision_manual"
mkdir "%CARPETA%\salida"

echo [3/3] Copiando archivos...
copy /y "%EXE%" "%CARPETA%\" >nul
if errorlevel 1 (
    echo ERROR: no se pudo copiar el ejecutable.
    pause
    exit /b 1
)
copy /y "config.ejemplo.txt" "%CARPETA%\config.txt" >nul
if errorlevel 1 (
    echo ERROR: no se pudo copiar config.ejemplo.txt como config.txt.
    pause
    exit /b 1
)

(
    echo 1. Abrir Extractor Comprobantes.exe
    echo 2. Pegar la API key cuando la pida
    echo 3. Agregar comprobantes y procesar
) > "%CARPETA%\LEEME.txt"

echo.
echo ====================================================
echo   Listo. La carpeta "%CARPETA%" esta lista
echo   para copiar a cada PC del equipo.
echo ====================================================
echo.
echo Contenido:
dir /b "%CARPETA%"
echo.
pause
exit /b 0
