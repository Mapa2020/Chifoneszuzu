import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, 
      (SELECT IFNULL(SUM(r.cantidad_necesaria * i.costo_unitario), 0) 
       FROM recetas r 
       JOIN ingredientes i ON r.ingrediente_id = i.ingrediente_id 
       WHERE r.producto_id = p.producto_id) as costo_produccion
      FROM productos p
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener un producto con su receta específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [prod] = await pool.query('SELECT * FROM productos WHERE producto_id = ?', [req.params.id]);
    const [receta] = await pool.query(`
      SELECT r.*, i.nombre, i.unidad_medida as unidad, i.costo_unitario 
      FROM recetas r 
      JOIN ingredientes i ON r.ingrediente_id = i.ingrediente_id 
      WHERE r.producto_id = ?`, [req.params.id]);
    res.json({ ...prod[0], receta });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { nombre, sabor, precio_snack, precio_externo, precio_especial, receta } = req.body;

    const [pResult] = await connection.query(
      'INSERT INTO productos (nombre, sabor, precio_snack, precio_externo, precio_especial) VALUES (?, ?, ?, ?, ?)',
      [nombre, sabor, precio_snack, precio_externo, precio_especial]
    );
    const productoId = pResult.insertId;

    if (receta && Array.isArray(receta)) {
      for (const item of receta) {
        await connection.query(
          'INSERT INTO recetas (producto_id, ingrediente_id, cantidad_necesaria) VALUES (?, ?, ?)',
          [productoId, item.ingrediente_id, item.cantidad_necesaria]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, productoId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;
  try {
    await connection.beginTransaction();
    const { nombre, sabor, precio_snack, precio_externo, precio_especial, receta } = req.body;

    // 1. Actualizar datos básicos
    await connection.query(
      'UPDATE productos SET nombre = ?, sabor = ?, precio_snack = ?, precio_externo = ?, precio_especial = ? WHERE producto_id = ?',
      [nombre, sabor, precio_snack, precio_externo, precio_especial, id]
    );

    // 2. Actualizar Receta (Borrar y re-insertar)
    await connection.query('DELETE FROM recetas WHERE producto_id = ?', [id]);
    
    if (receta && Array.isArray(receta)) {
      for (const item of receta) {
        await connection.query(
          'INSERT INTO recetas (producto_id, ingrediente_id, cantidad_necesaria) VALUES (?, ?, ?)',
          [id, item.ingrediente_id, item.cantidad_necesaria]
        );
      }
    }

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