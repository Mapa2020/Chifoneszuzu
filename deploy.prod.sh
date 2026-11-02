#!/bin/bash
set -e

echo "==================================================="
echo "🚀 ACTUALIZANDO CHIFONES ZUZÚ (PRODUCCIÓN - VPS)"
echo "==================================================="

# 1. Asegurar que existe el archivo .env
if [ ! -f .env ]; then
    echo "❌ ERROR: No se encontró el archivo .env en este directorio."
    echo "Crea el archivo .env a partir de .env.example antes de continuar."
    exit 1
fi

# 2. Descargar últimos cambios del repositorio
echo "📥 1/4 Descargando cambios del repositorio de Git..."
git pull origin main || true

# 3. Descargar las imágenes más recientes desde GitHub Container Registry
echo "🐳 2/4 Descargando imágenes actualizadas de GHCR..."
docker compose -f docker-compose.prod.yml pull

# 4. Levantar los servicios en segundo plano
echo "🔄 3/4 Reiniciando contenedores con las nuevas imágenes..."
docker compose -f docker-compose.prod.yml up -d

# 5. Limpiar imágenes huérfanas/antiguas para no llenar el disco del VPS
echo "🧹 4/4 Limpiando capas e imágenes antiguas en desuso..."
docker image prune -f

echo ""
echo "==================================================="
echo "✅ ¡Despliegue completado con éxito!"
echo "==================================================="
docker compose -f docker-compose.prod.yml ps

