import mysql from 'mysql2/promise';

console.log(`📡 Configurando conexión a DB: ${process.env.DB_NAME || 'bdchifon'} en host: ${process.env.DB_HOST || 'localhost'}`);

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: String(process.env.DB_PASSWORD || 'Czuma20'),
  database: process.env.DB_NAME || 'bdchifon',
  waitForConnections: true,
  multipleStatements: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("✅ Pool de conexiones MySQL configurado");