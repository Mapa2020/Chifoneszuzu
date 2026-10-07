import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';
import { getLocalDateString } from './dateUtils.js';

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
    const fecha = getLocalDateString();

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
    const fecha = getLocalDateString();

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

// Obtener historial de compras de insumos
router.get('/compras', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, p.nombre as proveedor_nombre, i.nombre as ingrediente_nombre, i.unidad_medida as ingrediente_unidad
      FROM egresos e
      LEFT JOIN proveedores p ON e.proveedor_id = p.proveedor_id
      LEFT JOIN ingredientes i ON e.ingrediente_id = i.ingrediente_id
      WHERE e.ambito = 'Proceso' AND (e.categoria = 'Ingredientes' OR e.ingrediente_id IS NOT NULL)
      ORDER BY e.fecha DESC, e.egreso_id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ingreso', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { ingrediente_id, cantidad, costo, proveedor_id } = req.body;
    const fecha = getLocalDateString();

    const [ing] = await connection.query('SELECT nombre, unidad_medida FROM ingredientes WHERE ingrediente_id = ?', [ingrediente_id]);
    if (!ing || ing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Insumo no encontrado" });
    }

    const cant = parseFloat(cantidad) || 1;
    const monto = parseFloat(costo) || 0;
    const precioUnitario = cant > 0 ? (monto / cant) : 0;
    const concepto = `Compra de ${ing[0].nombre} (${cant} ${ing[0].unidad_medida || ''})`.trim();

    // 1. Actualizar stock actual y costo unitario en el insumo
    await connection.query(
      'UPDATE ingredientes SET stock_actual = stock_actual + ?, costo_unitario = ? WHERE ingrediente_id = ?',
      [cant, precioUnitario, ingrediente_id]
    );

    // 2. Registrar en el historial de precios para la gráfica de evolución
    await connection.query(
      'INSERT INTO precio_insumos (ingrediente_id, fecha, costo_unitario) VALUES (?, ?, ?)',
      [ingrediente_id, fecha, precioUnitario]
    );

    // 3. Registrar en egresos (Gasto del Proceso 70%) vinculado al insumo
    await connection.query(
      `INSERT INTO egresos (fecha, tipo, concepto, monto, proveedor_id, ingrediente_id, ambito, categoria, cantidad, precio_unitario) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha, 'Ingredientes', concepto, monto, proveedor_id || null, ingrediente_id, 'Proceso', 'Ingredientes', cant, precioUnitario]
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