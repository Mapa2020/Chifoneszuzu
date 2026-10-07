# Script de actualización para PowerShell (Windows)
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    CHIFONES ZUZU - ACTUALIZACIÓN DOCKER DESKTOP    " -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan

param (
    [string]$Servicio = "all"
)

switch ($Servicio.ToLower()) {
    "backend" {
        Write-Host "`n🚀 Reconstruyendo únicamente Backend..." -ForegroundColor Green
        docker compose up -d --build backend
    }
    "frontend" {
        Write-Host "`n🚀 Reconstruyendo únicamente Frontend..." -ForegroundColor Green
        docker compose up -d --build frontend
    }
    "restart" {
        Write-Host "`n🔄 Reiniciando contenedores..." -ForegroundColor Green
        docker compose restart
    }
    default {
        Write-Host "`n🚀 Reconstruyendo imágenes y actualizando el sistema..." -ForegroundColor Green
        docker compose up -d --build
    }
}

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  ESTADO ACTUAL DE LOS SERVICIOS:" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
docker compose ps

Write-Host "`nAccesos activos:" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:8085"
Write-Host "  - Backend:  http://localhost:3001"
Write-Host "  - MySQL DB: localhost:3309 (bdchifon)`n"
