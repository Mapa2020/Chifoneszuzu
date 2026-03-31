import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ingredientes');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de precios de un insumo
router.get('/:id/historial', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT fecha, costo_unitario FROM precio_insumos WHERE ingrediente_id = ? ORDER BY fecha ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo ingrediente base (Ficha técnica)
router.post('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { nombre, unidad_medida, stock_minimo, costo_unitario } = req.body;
    const fecha = new Date().toISOString().split('T')[0];

    const [result] = await connection.query(
      'INSERT INTO ingredientes (nombre, unidad_medida, stock_actual, stock_minimo, costo_unitario) VALUES (?, ?, 0, ?, ?)',
      [nombre, unidad_medida, stock_minimo, costo_unitario || 0]
    );
    const ingredienteId = result.insertId;

    // Registrar el costo inicial en el historial
    await connection.query(
      'INSERT INTO precio_insumos (ingrediente_id, fecha, costo_unitario) VALUES (?, ?, ?)',
      [ingredienteId, fecha, costo_unitario || 0]
    );

    await connection.commit();
    res.json({ success: true, id: ingredienteId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Actualizar insumo (Ficha técnica y Costo)
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;
  const { nombre, unidad_medida, stock_minimo, costo_unitario } = req.body;

  try {
    await connection.beginTransaction();
    const fecha = new Date().toISOString().split('T')[0];

    // 1. Actualizar datos principales
    await connection.query(
      'UPDATE ingredientes SET nombre = ?, unidad_medida = ?, stock_minimo = ?, costo_unitario = ? WHERE ingrediente_id = ?',
      [nombre, unidad_medida, stock_minimo, costo_unitario, id]
    );

    // 2. Registrar en el historial de precios para el gráfico de evolución
    await connection.query(
      'INSERT INTO precio_insumos (ingrediente_id, fecha, costo_unitario) VALUES (?, ?, ?)',
      [id, fecha, costo_unitario]
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

router.post('/ingreso', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { ingrediente_id, cantidad, costo, proveedor_id } = req.body;
    const fecha = new Date().toISOString().split('T')[0];

    const [ing] = await connection.query('SELECT nombre FROM ingredientes WHERE ingrediente_id = ?', [ingrediente_id]);
    const concepto = `Compra de ${ing[0].nombre} (${cantidad})`;

    const precioUnitario = costo / cantidad;
    await connection.query(
      'UPDATE ingredientes SET stock_actual = stock_actual + ?, costo_unitario = ? WHERE ingrediente_id = ?',
      [cantidad, precioUnitario, ingrediente_id]
    );

    await connection.query(
      'INSERT INTO egresos (fecha, tipo, concepto, monto, proveedor_id) VALUES (?, ?, ?, ?, ?)',
      [fecha, 'Insumos', concepto, costo, proveedor_id || null]
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

export default router;