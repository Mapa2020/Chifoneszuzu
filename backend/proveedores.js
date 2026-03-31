import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

// Listar todos los proveedores
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM proveedores ORDER BY nombre ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar un nuevo proveedor (Solo Administrador)
router.post('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { nombre, telefono, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });

  try {
    const [result] = await pool.query(
      'INSERT INTO proveedores (nombre, telefono, direccion) VALUES (?, ?, ?)',
      [nombre, telefono || null, direccion || null]
    );
    res.json({ success: true, proveedor_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar proveedor
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, direccion } = req.body;
  try {
    await pool.query(
      'UPDATE proveedores SET nombre = ?, telefono = ?, direccion = ? WHERE proveedor_id = ?',
      [nombre, telefono, direccion, id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar proveedor
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    await pool.query('DELETE FROM proveedores WHERE proveedor_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    // Error por integridad referencial (si el proveedor tiene egresos asociados)
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: "No se puede eliminar el proveedor porque tiene registros de egresos asociados." });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;