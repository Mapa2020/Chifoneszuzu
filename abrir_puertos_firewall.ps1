# Script para configurar el Firewall de Windows en PowerShell
# Permite acceso a Chifones Zuzu desde celulares y otros dispositivos en la red local

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAR FIREWALL - CHIFONES ZUZÚ (DOCKER)     " -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Solicitando elevación a Administrador..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "Eliminando reglas restrictivas previas..." -ForegroundColor Gray
netsh advfirewall firewall delete rule name="Chifones" | Out-Null
netsh advfirewall firewall delete rule name="Chifones Zuzu Web (8085)" | Out-Null
netsh advfirewall firewall delete rule name="Chifones Zuzu Backend (3001)" | Out-Null

Write-Host "Creando reglas de Firewall para puertos 8085 y 3001..." -ForegroundColor Green
netsh advfirewall firewall add rule name="Chifones Zuzu Web (8085)" dir=in action=allow protocol=TCP localport=8085 profile=any description="Permite acceso web a Chifones Zuzu en Docker desde la red local" | Out-Null
netsh advfirewall firewall add rule name="Chifones Zuzu Backend (3001)" dir=in action=allow protocol=TCP localport=3001 profile=any description="Permite acceso API a Chifones Zuzu en Docker desde la red local" | Out-Null

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  ¡ÉXITO! Reglas de Firewall aplicadas.            " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes ingresar desde el navegador de tu celular a:" -ForegroundColor White
Write-Host "  👉 http://192.168.1.9:8085" -ForegroundColor Yellow
Write-Host ""
Write-Host "(Asegúrate de que el celular esté en la misma red Wi-Fi)`n"

Read-Host "Presiona Enter para salir"
