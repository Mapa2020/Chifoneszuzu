import express from 'express';
import { authenticateToken, authorizeRole } from './auth.js';
import { runBackup } from '../backup.js';

const router = express.Router();

router.post('/backup', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    const result = await runBackup();
    res.json({ 
      success: true, 
      message: `Respaldo completado con éxito: ${result.fileName} (${result.size} MB)` 
    });
  } catch (error) {
    res.status(500).json({ error: "Error al generar el respaldo del sistema." });
  }
});

export default router;