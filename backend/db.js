import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Czuma20',
  database: 'bdchifon',
  waitForConnections: true,
  timezone: '-05:00',
  connectionLimit: 10,
  queueLimit: 0
});

console.log("✅ Pool de conexiones MySQL configurado");