@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo =========================================
echo  Matriculación Digital - Modo Local
echo =========================================
echo.
echo Compilando aplicación... Esto puede tardar unos segundos.
echo.

call npm run build

if errorlevel 1 (
    echo.
    echo =========================================
    echo  ERROR: Fallo al compilar la aplicación.
    echo  Asegúrese de haber ejecutado 'npm install' primero.
    echo =========================================
    pause
    exit /b 1
)

echo.
echo =========================================
echo  Compilación correcta.
echo  Abriendo navegador en localhost:3000...
echo  CIERRE ESTA VENTANA para detener el servidor.
echo =========================================
echo.

start "" "http://localhost:3000"

npx vite preview --port 3000 --host 0.0.0.0
