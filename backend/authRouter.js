import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { JWT_SECRET } from './auth.js';

const router = express.Router();

// Login de usuarios
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);
    const user = rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.usuario_id, rol: user.rol }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ usuario_id: user.usuario_id, username: user.username, rol: user.rol, token });
    } else {
      res.status(401).json({ error: "Credenciales incorrectas" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;