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

// Obtener una venta específica con sus detalles
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [venta] = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre, u.username as vendedor_nombre
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      LEFT JOIN usuarios u ON v.usuario_id = u.usuario_id
      WHERE v.venta_id = ?
    `, [req.params.id]);

    if (venta.length === 0) return res.status(404).json({ error: "Venta no encontrada" });

    const [detalles] = await pool.query(`
      SELECT dv.*, p.nombre as producto_nombre
      FROM detalle_venta dv
      JOIN productos p ON dv.producto_id = p.producto_id
      WHERE dv.venta_id = ? AND dv.es_regalo = 0
    `, [req.params.id]);

    res.json({ ...venta[0], detalles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { cliente_id, total, forma_pago, detalles = [], fecha } = req.body;

    if (forma_pago === 'CreditoDia' && !cliente_id) {
      throw new Error("Se requiere un cliente identificado para ventas al crédito");
    }

    // 1. Agrupar requerimientos totales de ingredientes para validar stock
    const totalRequerido = {}; // { ingrediente_id: cantidad_total }

    for (const d of detalles) {
      const [receta] = await connection.query(
        'SELECT ingrediente_id, COALESCE(cantidad_necesaria, 0) as cantidad_necesaria FROM recetas WHERE producto_id = ?',
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
        const nombre = ing[0]?.nombre || 'Insumo';
        const disponible = Number(ing[0]?.stock_actual || 0);
        const unidad = ing[0]?.unidad_medida || '';
        const necesaria = Number(cantidadNecesaria);

        throw new Error(`Stock insuficiente de "${nombre}". Requerido: ${necesaria.toFixed(3)}${unidad}, Disponible: ${disponible.toFixed(3)}${unidad}`);
      }
    }

    // Usamos req.user.id que es como se guarda en el payload del JWT en authRouter.js
    const [vResult] = await connection.query(
      'INSERT INTO ventas (fecha, cliente_id, total, forma_pago, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [fecha || new Date().toISOString().split('T')[0], cliente_id || null, total, forma_pago, req.user.id]
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
        SET i.stock_actual = i.stock_actual - (COALESCE(r.cantidad_necesaria, 0) * ?)
        WHERE r.producto_id = ?`,
        [totalCantidadADeducir, d.producto_id]
      );
    }

    // 3. Consultar ingredientes que quedaron con stock crítico tras la venta
    const affectedIds = Object.keys(totalRequerido).map(Number);
    let alertas = [];
    if (affectedIds.length > 0) {
      [alertas] = await connection.query(
        'SELECT nombre, stock_actual, unidad_medida FROM ingredientes WHERE ingrediente_id IN (?) AND stock_actual <= stock_minimo',
        [affectedIds] // mysql2 maneja el array automáticamente para el operador IN
      );
    }

    await connection.commit();
    res.json({ success: true, ventaId, alertas });
  } catch (error) {
    await connection.rollback();
    console.error("Error al procesar la venta:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Eliminar Venta (Solo Admin) - Revierte stock y puntos
router.delete('/:id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || motivo.trim() === "") {
      return res.status(400).json({ error: "El motivo de eliminación es obligatorio" });
    }

    // 1. Obtener detalles para revertir stock y cliente para revertir puntos
    const [venta] = await connection.query('SELECT cliente_id FROM ventas WHERE venta_id = ?', [id]);
    const [detalles] = await connection.query('SELECT producto_id, cantidad, es_regalo FROM detalle_venta WHERE venta_id = ?', [id]);

    if (venta.length === 0) throw new Error("Venta no encontrada");

    // 2. Revertir stock de ingredientes
    for (const d of detalles) {
      await connection.query(`
        UPDATE ingredientes i
        JOIN recetas r ON i.ingrediente_id = r.ingrediente_id
        SET i.stock_actual = i.stock_actual + (COALESCE(r.cantidad_necesaria, 0) * ?)
        WHERE r.producto_id = ?`,
        [d.cantidad, d.producto_id]
      );
    }

    // 3. Revertir puntos si era cliente Snack
    if (venta[0].cliente_id) {
      await connection.query(
        "UPDATE clientes SET tarjeta_snack = GREATEST(0, tarjeta_snack - 1) WHERE cliente_id = ? AND categoria = 'Snack'",
        [venta[0].cliente_id]
      );
    }

    // Opcional: Podrías registrar el 'motivo' en una tabla de auditoría aquí antes de borrar
    console.log(`Venta #${id} eliminada por el usuario ${req.user.id}. Motivo: ${motivo}`);

    // 4. Eliminar registros
    await connection.query('DELETE FROM detalle_venta WHERE venta_id = ?', [id]);
    await connection.query('DELETE FROM ventas WHERE venta_id = ?', [id]);

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Actualizar Venta (Solo Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { cliente_id, total, forma_pago, detalles = [], fecha } = req.body;

    // --- PASO 1: REVERTIR ESTADO ANTERIOR ---
    const [oldVenta] = await connection.query('SELECT cliente_id FROM ventas WHERE venta_id = ?', [id]);
    const [oldDetalles] = await connection.query('SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = ?', [id]);

    for (const od of oldDetalles) {
      await connection.query(`
        UPDATE ingredientes i
        JOIN recetas r ON i.ingrediente_id = r.ingrediente_id
        SET i.stock_actual = i.stock_actual + (COALESCE(r.cantidad_necesaria, 0) * ?)
        WHERE r.producto_id = ?`,
        [od.cantidad, od.producto_id]
      );
    }
    if (oldVenta[0].cliente_id) {
      await connection.query("UPDATE clientes SET tarjeta_snack = GREATEST(0, tarjeta_snack - 1) WHERE cliente_id = ?", [oldVenta[0].cliente_id]);
    }

    // --- PASO 2: APLICAR NUEVOS DATOS ---
    await connection.query(
      'UPDATE ventas SET cliente_id = ?, total = ?, forma_pago = ?, fecha = ? WHERE venta_id = ?',
      [cliente_id || null, total, forma_pago, fecha || new Date().toISOString().split('T')[0], id]
    );

    await connection.query('DELETE FROM detalle_venta WHERE venta_id = ?', [id]);

    for (const d of detalles) {
      await connection.query(
        'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal, es_regalo) VALUES (?, ?, ?, ?, ?, ?)',
        [id, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal, 0]
      );
      if (d.cantidad >= 10) {
        await connection.query('INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal, es_regalo) VALUES (?, ?, 1, 0, 0, 1)', [id, d.producto_id]);
      }

      const totalCantidad = d.cantidad >= 10 ? d.cantidad + 1 : d.cantidad;
      await connection.query(`
        UPDATE ingredientes i
        JOIN recetas r ON i.ingrediente_id = r.ingrediente_id
        SET i.stock_actual = i.stock_actual - (COALESCE(r.cantidad_necesaria, 0) * ?)
        WHERE r.producto_id = ?`,
        [totalCantidad, d.producto_id]
      );
    }

    if (cliente_id) {
      await connection.query("UPDATE clientes SET tarjeta_snack = tarjeta_snack + 1 WHERE cliente_id = ? AND categoria = 'Snack'", [cliente_id]);
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