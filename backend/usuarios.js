import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Middleware para verificar si el usuario es Administrador
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'Administrador') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
};

// Obtener todos los usuarios (solo para Administradores)
router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // No seleccionar la contraseña por seguridad
    const [rows] = await pool.query('SELECT usuario_id, username, rol, activo FROM usuarios ORDER BY username ASC');
    res.json(rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo usuario (solo para Administradores)
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  const { username, password, rol, activo } = req.body;
  if (!username || !password || !rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: username, password, rol.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (username, password, rol, activo) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, rol, activo ?? 1]
    );
    res.status(201).json({ message: 'Usuario creado exitosamente', usuario_id: result.insertId });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El nombre de usuario ya existe.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un usuario existente (solo para Administradores)
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, password, rol, activo } = req.body;
  
  try {
    let updateQuery = 'UPDATE usuarios SET username = ?, rol = ?, activo = ?';
    const queryParams = [username, rol, activo];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE usuario_id = ?';
    queryParams.push(id);

    const [result] = await pool.query(updateQuery, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El nombre de usuario ya existe.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un usuario (solo para Administradores)
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;

  // Evitar que un administrador se elimine a sí mismo
  if (req.user.id === parseInt(id)) {
    return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
  }

  try {
    const [result] = await pool.query('DELETE FROM usuarios WHERE usuario_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;