import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: 'root',
  password: 'Czuma20',
  database: 'bdchifon',
  waitForConnections: true,
  multipleStatements: true,
  timezone: '-05:00',
  connectionLimit: 10,
  queueLimit: 0
});

console.log("✅ Pool de conexiones MySQL configurado");