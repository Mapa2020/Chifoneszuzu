@echo off
chcp 65001 > nul
title Configurar Firewall de Windows - Chifones Zuzú

echo ========================================================
echo   CONFIGURANDO FIREWALL DE WINDOWS - CHIFONES ZUZÚ
echo ========================================================
echo.
echo Aplicando reglas de red para permitir acceso desde celular...
echo.

:: 1. Eliminar reglas antiguas para evitar conflictos
netsh advfirewall firewall delete rule name="Chifones" >nul 2>&1
netsh advfirewall firewall delete rule name="Chifones Zuzu Web (8085)" >nul 2>&1
netsh advfirewall firewall delete rule name="Chifones Zuzu Backend (3001)" >nul 2>&1

:: 2. Crear reglas universales (permiten cualquier proceso en puertos 8085 y 3001)
netsh advfirewall firewall add rule name="Chifones Zuzu Web (8085)" dir=in action=allow protocol=TCP localport=8085 profile=any description="Permite acceso web a Chifones Zuzu en Docker desde la red local"
set ERR_WEB=%errorlevel%

netsh advfirewall firewall add rule name="Chifones Zuzu Backend (3001)" dir=in action=allow protocol=TCP localport=3001 profile=any description="Permite acceso API a Chifones Zuzu en Docker desde la red local"
set ERR_API=%errorlevel%

echo.
if %ERR_WEB% neq 0 (
    echo ========================================================
    echo  [AVISO] Se requieren permisos de Administrador.
    echo ========================================================
    echo.
    echo  Para aplicar los cambios:
    echo  1. Haz CLIC DERECHO sobre este archivo:
    echo     abrir_puertos_firewall.bat
    echo  2. Selecciona "Ejecutar como administrador"
    echo.
) else (
    echo ========================================================
    echo  ¡ÉXITO! Los puertos 8085 y 3001 han sido habilitados.
    echo ========================================================
    echo.
    echo  Ahora los dispositivos de tu red local (celulares, tablets)
    echo  pueden ingresar a la aplicación usando:
    echo.
    echo     http://192.168.1.9:8085
    echo.
    echo  (Asegúrate de que el celular esté en la misma red Wi-Fi).
    echo.
)

echo Presiona cualquier tecla para salir...
pause > nul
