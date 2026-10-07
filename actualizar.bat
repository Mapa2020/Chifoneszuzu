@echo off
chcp 65001 > nul
title Actualizar Chifones Zuzú - Docker Desktop

echo ===================================================
echo     CHIFONES ZUZU - ACTUALIZACIÓN DOCKER DESKTOP
echo ===================================================
echo.

:menu
echo Selecciona una opción:
echo.
echo  [1] Actualizar TODO (Reconstruir Backend y Frontend)
echo  [2] Actualizar solo Backend (rápido)
echo  [3] Actualizar solo Frontend (rápido)
echo  [4] Reiniciar contenedores (sin compilar de nuevo)
echo  [5] Ver estado y últimos logs
echo  [0] Salir
echo.
set /p opt="Ingresa tu opción (1-5, o presiona Enter para [1]): "

if "%opt%"=="" goto opt1
if "%opt%"=="1" goto opt1
if "%opt%"=="2" goto opt2
if "%opt%"=="3" goto opt3
if "%opt%"=="4" goto opt4
if "%opt%"=="5" goto opt5
if "%opt%"=="0" goto end
echo Opción inválida. Intenta nuevamente.
goto menu

:opt1
echo.
echo ===================================================
echo  [1/2] Reconstruyendo imágenes y actualizando...
echo ===================================================
docker compose up -d --build
goto finish

:opt2
echo.
echo ===================================================
echo  Reconstruyendo únicamente el Backend...
echo ===================================================
docker compose up -d --build backend
goto finish

:opt3
echo.
echo ===================================================
echo  Reconstruyendo únicamente el Frontend...
echo ===================================================
docker compose up -d --build frontend
goto finish

:opt4
echo.
echo ===================================================
echo  Reiniciando todos los contenedores...
echo ===================================================
docker compose restart
goto finish

:opt5
echo.
echo Estado de los contenedores:
docker compose ps
echo.
echo Últimos logs del Backend:
docker compose logs --tail 25 backend
goto end_pause

:finish
echo.
echo ===================================================
echo   ESTADO ACTUAL DE LOS SERVICIOS:
echo ===================================================
docker compose ps
echo.
echo ===================================================
echo   ACCESOS ACTIVOS:
echo   - Frontend: http://localhost:8085
echo   - Backend:  http://localhost:3001
echo   - Base DB:  localhost:3309 (bdchifon)
echo ===================================================
echo.
echo ¡Actualización completada con éxito!

:end_pause
echo.
pause
:end
