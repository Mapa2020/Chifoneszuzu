#!/bin/bash

echo "🚀 Iniciando actualización del sistema..."

# Bajar últimos cambios de Git
git pull origin main

# Reconstruir y levantar solo los contenedores que cambiaron
docker compose up -d --build

echo ""
echo "📊 Estado de los contenedores:"
docker compose ps

echo ""
echo "✅ ¡Sistema actualizado con éxito!"
echo "👉 Frontend: http://localhost:8085"
echo "👉 Backend:  http://localhost:3001"