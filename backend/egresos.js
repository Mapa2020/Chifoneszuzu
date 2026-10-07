import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';
import { getLocalDateString } from './dateUtils.js';

const router = express.Router();

// Listar todos los egresos con filtros opcionales (ambito, fecha, mes)
router.get('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  try {
    const { ambito, mes, year, startDate, endDate } = req.query;
    let query = `
      SELECT e.*, 
             p.nombre as proveedor_nombre,
             i.nombre as ingrediente_nombre,
             i.unidad_medida as ingrediente_unidad
      FROM egresos e
      LEFT JOIN proveedores p ON e.proveedor_id = p.proveedor_id
      LEFT JOIN ingredientes i ON e.ingrediente_id = i.ingrediente_id
      WHERE 1=1
    `;
    const params = [];

    if (ambito && ambito !== 'Todos') {
      query += ' AND e.ambito = ?';
      params.push(ambito);
    }

    if (startDate && endDate) {
      query += ' AND e.fecha BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (mes && year) {
      query += ' AND MONTH(e.fecha) = ? AND YEAR(e.fecha) = ?';
      params.push(mes, year);
    }

    query += ' ORDER BY e.fecha DESC, e.egreso_id DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar un nuevo egreso
router.post('/', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { 
    fecha, 
    ambito, 
    categoria, 
    cantidad, 
    precio_unitario, 
    monto, 
    concepto, 
    proveedor_id, 
    tipo, 
    ingrediente_id 
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const finalAmbito = ambito || 'Proceso';
    const finalCategoria = String(categoria || tipo || 'Otros').slice(0, 50);
    const finalTipo = String(tipo || categoria || 'Otros').slice(0, 50);
    const cant = cantidad !== undefined && cantidad !== '' ? Number(cantidad) : 1;
    const unit = precio_unitario !== undefined && precio_unitario !== '' ? Number(precio_unitario) : null;
    const finalMonto = monto !== undefined && monto !== '' ? Number(monto) : (cant * (unit || 0));
    const finalFecha = fecha || getLocalDateString();
    const finalIngredienteId = ingrediente_id ? Number(ingrediente_id) : null;

    const [result] = await connection.query(
      `INSERT INTO egresos (fecha, ambito, categoria, cantidad, precio_unitario, tipo, concepto, monto, proveedor_id, ingrediente_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalFecha,
        finalAmbito,
        finalCategoria,
        cant,
        unit,
        finalTipo,
        concepto || '',
        finalMonto,
        proveedor_id || null,
        finalIngredienteId
      ]
    );

    // Si está vinculado a un insumo, actualizar el stock y registrar costo unitario
    if (finalIngredienteId) {
      const unitCost = unit !== null ? unit : (cant > 0 ? (finalMonto / cant) : 0);
      
      // 1. Aumentar stock_actual y actualizar costo_unitario del insumo
      await connection.query(
        'UPDATE ingredientes SET stock_actual = stock_actual + ?, costo_unitario = ? WHERE ingrediente_id = ?',
        [cant, unitCost, finalIngredienteId]
      );

      // 2. Registrar en precio_insumos para el gráfico histórico de evolución de precios
      await connection.query(
        'INSERT INTO precio_insumos (ingrediente_id, fecha, costo_unitario) VALUES (?, ?, ?)',
        [finalIngredienteId, finalFecha, unitCost]
      );
    }

    await connection.commit();
    res.json({ success: true, egreso_id: result.insertId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Actualizar un egreso existente
router.put('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const { id } = req.params;
  const { 
    fecha, 
    ambito, 
    categoria, 
    cantidad, 
    precio_unitario, 
    monto, 
    concepto, 
    proveedor_id, 
    tipo, 
    ingrediente_id 
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener egreso anterior para revertir impacto en stock si correspondía
    const [existing] = await connection.query('SELECT * FROM egresos WHERE egreso_id = ?', [id]);
    if (!existing || existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Egreso no encontrado' });
    }
    const oldEgreso = existing[0];

    const finalAmbito = ambito || 'Proceso';
    const finalCategoria = String(categoria || tipo || 'Otros').slice(0, 50);
    const finalTipo = String(tipo || categoria || 'Otros').slice(0, 50);
    const cant = cantidad !== undefined && cantidad !== '' ? Number(cantidad) : 1;
    const unit = precio_unitario !== undefined && precio_unitario !== '' ? Number(precio_unitario) : null;
    const finalMonto = monto !== undefined && monto !== '' ? Number(monto) : (cant * (unit || 0));
    const finalFecha = fecha || getLocalDateString();
    const finalIngredienteId = ingrediente_id ? Number(ingrediente_id) : null;

    // 1. Revertir stock del insumo anterior si existía
    if (oldEgreso.ingrediente_id) {
      await connection.query(
        'UPDATE ingredientes SET stock_actual = GREATEST(0, stock_actual - ?) WHERE ingrediente_id = ?',
        [Number(oldEgreso.cantidad || 0), oldEgreso.ingrediente_id]
      );
    }

    // 2. Aplicar stock al nuevo insumo (si está vinculado)
    if (finalIngredienteId) {
      const unitCost = unit !== null ? unit : (cant > 0 ? (finalMonto / cant) : 0);
      await connection.query(
        'UPDATE ingredientes SET stock_actual = stock_actual + ?, costo_unitario = ? WHERE ingrediente_id = ?',
        [cant, unitCost, finalIngredienteId]
      );
      await connection.query(
        'INSERT INTO precio_insumos (ingrediente_id, fecha, costo_unitario) VALUES (?, ?, ?)',
        [finalIngredienteId, finalFecha, unitCost]
      );
    }

    // 3. Actualizar registro del egreso
    await connection.query(
      `UPDATE egresos 
       SET fecha = ?, ambito = ?, categoria = ?, cantidad = ?, precio_unitario = ?, tipo = ?, concepto = ?, monto = ?, proveedor_id = ?, ingrediente_id = ?
       WHERE egreso_id = ?`,
      [
        finalFecha,
        finalAmbito,
        finalCategoria,
        cant,
        unit,
        finalTipo,
        concepto,
        finalMonto,
        proveedor_id || null,
        finalIngredienteId,
        id
      ]
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

// Eliminar un egreso
router.delete('/:id', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT * FROM egresos WHERE egreso_id = ?', [req.params.id]);
    if (existing && existing.length > 0) {
      const egreso = existing[0];
      // Si el egreso estaba vinculado a un insumo, revertir el stock sumado
      if (egreso.ingrediente_id && egreso.cantidad) {
        await connection.query(
          'UPDATE ingredientes SET stock_actual = GREATEST(0, stock_actual - ?) WHERE ingrediente_id = ?',
          [Number(egreso.cantidad), egreso.ingrediente_id]
        );
      }
      await connection.query('DELETE FROM egresos WHERE egreso_id = ?', [req.params.id]);
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