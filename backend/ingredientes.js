import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

// Listar todos los ingredientes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ingredientes ORDER BY nombre ASC');
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

// Registrar/Actualizar Insumo y su Precio
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;
  const { nombre, unidad_medida, stock_minimo, costo_unitario } = req.body;

  try {
    await connection.beginTransaction();
    const fecha = new Date().toISOString().split('T')[0];

    // 1. Actualizar tabla principal
    await connection.query(
      'UPDATE ingredientes SET nombre = ?, unidad_medida = ?, stock_minimo = ?, costo_unitario = ? WHERE ingrediente_id = ?',
      [nombre, unidad_medida, stock_minimo, costo_unitario, id]
    );

    // 2. Registrar en el historial de precios
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

// Registrar ingreso de mercadería (Compra)
router.post('/ingreso', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  const { ingrediente_id, cantidad, costo, proveedor_id } = req.body;

  try {
    await connection.beginTransaction();
    const fecha = new Date().toISOString().split('T')[0];
    const nuevoCostoUnitario = costo / cantidad;

    // 1. Aumentar stock y actualizar costo unitario
    await connection.query(
      'UPDATE ingredientes SET stock_actual = stock_actual + ?, costo_unitario = ? WHERE ingrediente_id = ?',
      [cantidad, nuevoCostoUnitario, ingrediente_id]
    );

    // 2. Registrar en el historial
    await connection.query(
      'INSERT INTO precio_insumos (ingrediente_id, fecha, costo_unitario) VALUES (?, ?, ?)',
      [ingrediente_id, fecha, nuevoCostoUnitario]
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