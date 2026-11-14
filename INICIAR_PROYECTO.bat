@echo off
chcp 65001 > nul
title SIMULADOR BANCARIO WEB - INICIADOR AUTOMATICO
color 0B

echo ==============================================================================
echo        BANCO ANDINO - SIMULADOR BANCARIO WEB (PROYECTO INTEGRADOR)
echo                Jairo Andres Pai Guanga - Ingenieria en Ciberseguridad
echo ==============================================================================
echo.

:: 1. Verificar si MySQL esta corriendo en el puerto 3306
echo [1/3] Verificando servicio de base de datos MySQL (puerto 3306)...
powershell -NoProfile -Command "try { $client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 3306); $client.Close(); exit 0 } catch { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo [ALERTA] MySQL no esta respondiendo en el puerto 3306.
    echo Asegurate de abrir XAMPP Control Panel y hacer clic en [Start] en MySQL.
    echo.
    pause
) else (
    echo [OK] MySQL activo y respondiendo correctamente.
)
echo.

:: 2. Iniciar Backend Express (puerto 3000)
echo [2/3] Levantando Backend transaccional Node.js / Express en segundo plano...
start "Backend Banco (Puerto 3000)" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 /nobreak > nul

:: 3. Iniciar Frontend React + Vite (puerto 8080)
echo [3/3] Levantando Frontend React 19 + Tailwind en segundo plano...
start "Frontend Banco (Puerto 8080)" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak > nul

:: 4. Abrir en el navegador por defecto
echo.
echo ==============================================================================
echo  SISTEMA BANCARIO LISTO PARA LA DEMOSTRACION
echo ==============================================================================
echo  - Banca Virtual: http://localhost:8080
echo  - Cajero ATM:    http://localhost:8080/cajero
echo  - Admin Banco:   http://localhost:8080/admin
echo.
echo  CREDENCIALES:
echo  * Admin:   admin@banco.com  / Banco123*
echo  * Cliente: andres@cliente.com / Banco123* (Cuenta: 400110203040 / PIN: 1234)
echo ==============================================================================
echo Abriendo navegador...
start http://localhost:8080
pause
