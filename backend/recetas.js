import express from 'express';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Listar todas las recetas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM recetas');
    res.json(rows);
  } catch (error) {
    console.error("Error fetching recetas:", error);
    res.status(500).json({ error: "Error al obtener las recetas." });
  }
});

export default router;
