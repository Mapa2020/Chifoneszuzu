import express from 'express';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Listar ventas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre, u.username as vendedor_nombre
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      LEFT JOIN usuarios u ON v.usuario_id = u.usuario_id
      ORDER BY v.fecha DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { cliente_id, total, forma_pago, detalles = [] } = req.body;

    if (forma_pago === 'CreditoDia' && !cliente_id) {
      throw new Error("Se requiere un cliente identificado para ventas al crédito");
    }

    // 1. Agrupar requerimientos totales de ingredientes para validar stock
    const totalRequerido = {}; // { ingrediente_id: cantidad_total }

    for (const d of detalles) {
      const [receta] = await connection.query(
        'SELECT ingrediente_id, cantidad_necesaria FROM recetas WHERE producto_id = ?',
        [d.producto_id]
      );
      
      // Aplicar lógica 10+1 para el cálculo de stock necesario
      const cantidadConRegalo = d.cantidad >= 10 ? d.cantidad + 1 : d.cantidad;

      receta.forEach(r => {
        const id = r.ingrediente_id;
        const totalItem = r.cantidad_necesaria * cantidadConRegalo;
        totalRequerido[id] = (totalRequerido[id] || 0) + totalItem;
      });
    }

    // 2. Verificar stock actual con bloqueo de lectura (FOR UPDATE)
    for (const [ingredienteId, cantidadNecesaria] of Object.entries(totalRequerido)) {
      const [ing] = await connection.query(
        'SELECT nombre, stock_actual, unidad_medida FROM ingredientes WHERE ingrediente_id = ? FOR UPDATE',
        [ingredienteId]
      );

      if (!ing[0] || ing[0].stock_actual < cantidadNecesaria) {
        const nombre = ing[0]?.nombre || 'Ingrediente desconocido';
        const disponible = ing[0]?.stock_actual || 0;
        const unidad = ing[0]?.unidad_medida || '';
        
        throw new Error(`Stock insuficiente de "${nombre}". Requerido: ${cantidadNecesaria.toFixed(2)}${unidad}, Disponible: ${disponible.toFixed(2)}${unidad}`);
      }
    }

    const fecha = new Date().toISOString().split('T')[0];

    const [vResult] = await connection.query(
      'INSERT INTO ventas (fecha, cliente_id, total, forma_pago, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [fecha, cliente_id || null, total, forma_pago, req.user.id]
    );
    const ventaId = vResult.insertId;

    if (cliente_id) {
      await connection.query(
        "UPDATE clientes SET tarjeta_snack = tarjeta_snack + 1 WHERE cliente_id = ? AND categoria = 'Snack'",
        [cliente_id]
      );
    }

    for (const d of detalles) {
      await connection.query(
        'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal, es_regalo) VALUES (?, ?, ?, ?, ?, ?)',
        [ventaId, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal, 0]
      );

      if (d.cantidad >= 10) {
        await connection.query(
          'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal, es_regalo) VALUES (?, ?, ?, ?, ?, ?)',
          [ventaId, d.producto_id, 1, 0, 0, 1]
        );
      }

      // Deducción de stock consolidada (Venta + Regalo si aplica)
      const totalCantidadADeducir = d.cantidad >= 10 ? d.cantidad + 1 : d.cantidad;
      await connection.query(`
        UPDATE ingredientes i
        JOIN recetas r ON i.ingrediente_id = r.ingrediente_id
        SET i.stock_actual = i.stock_actual - (r.cantidad_necesaria * ?)
        WHERE r.producto_id = ?`,
        [totalCantidadADeducir, d.producto_id]
      );
    }

    // 3. Consultar ingredientes que quedaron con stock crítico tras la venta
    const affectedIds = Object.keys(totalRequerido);
    let alertas = [];
    if (affectedIds.length > 0) {
      [alertas] = await connection.query(
        'SELECT nombre, stock_actual, unidad_medida FROM ingredientes WHERE ingrediente_id IN (?) AND stock_actual <= stock_minimo',
        [affectedIds]
      );
    }

    await connection.commit();
    res.json({ success: true, ventaId, alertas });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

export default router;