FROM node:20-slim AS base

WORKDIR /app

# Instalamos dependencias primero para aprovechar el cache de capas
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]