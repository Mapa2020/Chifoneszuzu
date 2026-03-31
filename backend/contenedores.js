import express from 'express';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Listar estado de contenedores
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, cl.nombre as cliente_nombre 
      FROM contenedores c 
      LEFT JOIN clientes cl ON c.cliente_id = cl.cliente_id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar devolución
router.post('/devolver/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      "UPDATE contenedores SET estado = 'Devuelto', uso_actual = uso_actual + 1 WHERE contenedor_id = ?",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;