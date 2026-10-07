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
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    const [rows] = await pool.query('SELECT * FROM usuarios WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    if (user.activo === 0) {
      return res.status(403).json({ error: "Tu cuenta ha sido suspendida temporalmente" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (validPassword) {
      // Usamos 'id' para coincidir con la expectativa de los otros routers (req.user.id)
      const token = jwt.sign(
        { id: user.usuario_id, username: user.username, rol: user.rol, cliente_id: user.cliente_id }, 
        JWT_SECRET, { expiresIn: '7d' });
      res.json({ usuario_id: user.usuario_id, username: user.username, rol: user.rol, token, cliente_id: user.cliente_id });
    } else {
      res.status(401).json({ error: "Credenciales incorrectas" });
    }
  } catch (error) {
    console.error("❌ Error en el proceso de Login:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;