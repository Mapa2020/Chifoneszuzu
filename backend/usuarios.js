import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

// Listar todos los usuarios (Solo Admin)
router.get('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT usuario_id, username, rol FROM usuarios ORDER BY username ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo usuario
router.post('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { username, password, rol } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)',
      [username, hashedPassword, rol]
    );
    res.json({ success: true, usuario_id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { id } = req.params;
  const { username, password, rol } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE usuarios SET username = ?, password = ?, rol = ? WHERE usuario_id = ?',
        [username, hashedPassword, rol, id]
      );
    } else {
      await pool.query('UPDATE usuarios SET username = ?, rol = ? WHERE usuario_id = ?', [username, rol, id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE usuario_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;