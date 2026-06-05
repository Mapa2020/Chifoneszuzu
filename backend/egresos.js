import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

// Listar todos los egresos
router.get('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM egresos ORDER BY fecha DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar un nuevo egreso
router.post('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { fecha, tipo, concepto, monto, proveedor_id } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO egresos (fecha, tipo, concepto, monto, proveedor_id) VALUES (?, ?, ?, ?, ?)',
      [fecha, tipo, concepto, monto, proveedor_id || null]
    );
    res.json({ success: true, egreso_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un egreso existente
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { id } = req.params;
  const { fecha, tipo, concepto, monto, proveedor_id } = req.body;
  try {
    await pool.query(
      'UPDATE egresos SET fecha = ?, tipo = ?, concepto = ?, monto = ?, proveedor_id = ? WHERE egreso_id = ?',
      [fecha, tipo, concepto, monto, proveedor_id || null, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un egreso
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    await pool.query('DELETE FROM egresos WHERE egreso_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;