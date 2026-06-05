import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

// Listar estado de contenedores
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT c.*, cl.nombre as cliente_nombre 
      FROM contenedores c 
      LEFT JOIN clientes cl ON c.cliente_id = cl.cliente_id
    `;
    let params = [];

    if (req.user.rol !== 'Administrador') {
      query += " WHERE c.cliente_id = (SELECT cliente_id FROM usuarios WHERE usuario_id = ?) ";
      params.push(req.user.id);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar devolución
router.post('/devolver/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [cont] = await connection.query("SELECT cliente_id FROM contenedores WHERE contenedor_id = ?", [req.params.id]);
    
    await connection.query(
      "UPDATE contenedores SET estado = 'Devuelto', uso_actual = uso_actual + 1 WHERE contenedor_id = ?",
      [req.params.id]
    );

    // Registrar en historial con fecha actual
    await connection.query(
      "INSERT INTO historial_contenedores (contenedor_id, cliente_id, fecha, tipo) VALUES (?, ?, NOW(), 'Devolucion')",
      [req.params.id, cont[0]?.cliente_id]
    );

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Obtener Cartilla Digital y Reporte de Promoción
router.get('/cartilla/:clienteId', authenticateToken, async (req, res) => {
  try {
    const { clienteId } = req.params;

    // 1. Datos del cliente
    const [cliente] = await pool.query("SELECT * FROM clientes WHERE cliente_id = ?", [clienteId]);
    if (cliente.length === 0) return res.status(404).json({ error: "Cliente no encontrado" });

    // 2. Historial de Ventas (Entregas de chifones)
    const [ventas] = await pool.query(
      "SELECT fecha, venta_id FROM ventas WHERE cliente_id = ? ORDER BY fecha DESC", [clienteId]
    );

    // 3. Historial de Devoluciones
    const [devoluciones] = await pool.query(
      "SELECT fecha FROM historial_contenedores WHERE cliente_id = ? AND tipo = 'Devolucion' ORDER BY fecha DESC", [clienteId]
    );

    // 4. Lógica de Promoción: 10 ventas, mín 3 por semana, durante 3 semanas.
    // Agrupar ventas por semana (usando YEARWEEK de MySQL para consistencia)
    const [semanas] = await pool.query(`
      SELECT YEARWEEK(fecha, 1) as semana_id, COUNT(*) as cantidad 
      FROM ventas 
      WHERE cliente_id = ? 
      GROUP BY semana_id 
      ORDER BY semana_id DESC
    `, [clienteId]);

    const semanasCumplidas = semanas.map(s => ({
      semana: s.semana_id,
      cantidad: s.cantidad,
      cumple: s.cantidad >= 3
    }));

    const totalSemanasExitosas = semanasCumplidas.filter(s => s.cumple).length;
    const totalVentas = ventas.length;
    
    // El regalo se activa si tiene 10 ventas totales Y al menos 3 semanas con 3+ ventas
    const aplicaRegalo = totalVentas >= 10 && totalSemanasExitosas >= 3;

    res.json({
      cliente: cliente[0],
      ventas,
      devoluciones,
      promocion: {
        totalVentas,
        totalSemanasExitosas,
        aplicaRegalo,
        detalleSemanas: semanasCumplidas
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;