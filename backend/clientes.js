import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

// Listar todos los clientes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo cliente
router.post('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    const { nombre, categoria, telefono, direccion, zona } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });

    const [result] = await pool.query(
      'INSERT INTO clientes (nombre, categoria, telefono, direccion, zona) VALUES (?, ?, ?, ?, ?)',
      [nombre, categoria || 'Snack', telefono || null, direccion || null, zona || 'OTROS']
    );
    res.json({ success: true, cliente_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cliente
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, telefono, direccion, zona } = req.body;
    await pool.query(
      'UPDATE clientes SET nombre = ?, categoria = ?, telefono = ?, direccion = ?, zona = ? WHERE cliente_id = ?',
      [nombre, categoria, telefono, direccion, zona || 'OTROS', id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar cliente
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM clientes WHERE cliente_id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({ error: "No se puede eliminar el cliente porque tiene ventas asociadas." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;