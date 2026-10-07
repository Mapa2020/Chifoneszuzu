import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';
import { getLocalDateString } from './dateUtils.js';
import {
  ensureCartillaActiva,
  obtenerCartillaCliente,
  obtenerResumenContenedores,
  registrarDevolucion,
  getSaborAbrev
} from './contenedoresService.js';

const router = express.Router();

// 1. Resumen global de control de envases y lista de clientes Snack
router.get('/resumen', authenticateToken, async (req, res) => {
  try {
    const data = await obtenerResumenContenedores(pool, req.user);
    res.json(data);
  } catch (error) {
    console.error("Error al obtener resumen de contenedores:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Obtener Cartilla Visual de un Cliente Snack (se genera dinámicamente)
router.get('/cartilla/:clienteId', authenticateToken, async (req, res) => {
  try {
    const { clienteId } = req.params;
    const data = await obtenerCartillaCliente(pool, clienteId);
    res.json(data);
  } catch (error) {
    console.error("Error al obtener cartilla del cliente:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Registrar Devolución Diaria Manual (al regresar de las entregas)
router.post('/devolucion', authenticateToken, async (req, res) => {
  try {
    const { cliente_id, cantidad, fecha, condicion, observaciones } = req.body;
    if (!cliente_id || !cantidad) {
      return res.status(400).json({ error: "Cliente y cantidad son requeridos" });
    }

    const result = await registrarDevolucion(pool, {
      clienteId: cliente_id,
      cantidad,
      fecha,
      condicion,
      observaciones,
      usuarioId: req.user.id
    });

    res.json(result);
  } catch (error) {
    console.error("Error al registrar devolución de envases:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Modificar o marcar un Slot de la Cartilla directamente (edición interactiva)
router.put('/cartilla/:cartillaId/slot/:slotNumero', authenticateToken, async (req, res) => {
  try {
    const { cartillaId, slotNumero } = req.params;
    const { fecha_venta, sabor_abrev, fecha_devolucion, envase_devuelto, observaciones } = req.body;

    await pool.query(
      `UPDATE cartilla_slots 
       SET fecha_venta = ?, sabor_abrev = ?, fecha_devolucion = ?, envase_devuelto = ?, observaciones = ?
       WHERE cartilla_id = ? AND slot_numero = ?`,
      [
        fecha_venta || null,
        sabor_abrev ? sabor_abrev.toUpperCase() : null,
        fecha_devolucion || null,
        envase_devuelto ? 1 : 0,
        observaciones || null,
        cartillaId,
        slotNumero
      ]
    );

    // Recalcular contadores de la cartilla
    const [counts] = await pool.query(
      `SELECT 
         COUNT(CASE WHEN fecha_venta IS NOT NULL THEN 1 END) as chifones,
         COUNT(CASE WHEN envase_devuelto = 1 THEN 1 END) as devueltos
       FROM cartilla_slots WHERE cartilla_id = ?`,
      [cartillaId]
    );

    await pool.query(
      `UPDATE cartillas_cliente 
       SET chifones_acumulados = ?, envases_devueltos = ?
       WHERE cartilla_id = ?`,
      [counts[0].chifones, counts[0].devueltos, cartillaId]
    );

    res.json({ success: true, chifones: counts[0].chifones, devueltos: counts[0].devueltos });
  } catch (error) {
    console.error("Error al actualizar slot de cartilla:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Actualizar Metadatos de la Cartilla (Vencimiento, notas manuales, código)
router.put('/cartilla/:cartillaId/meta', authenticateToken, async (req, res) => {
  try {
    const { cartillaId } = req.params;
    const { numero_cartilla, fecha_vencimiento, notas, tipo } = req.body;

    await pool.query(
      `UPDATE cartillas_cliente 
       SET numero_cartilla = COALESCE(?, numero_cartilla),
           fecha_vencimiento = COALESCE(?, fecha_vencimiento),
           notas = COALESCE(?, notas),
           tipo = COALESCE(?, tipo)
       WHERE cartilla_id = ?`,
      [numero_cartilla, fecha_vencimiento, notas, tipo, cartillaId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Canjear Premio de Chifón Gratis y Finalizar Cartilla
router.post('/cartilla/:cartillaId/canjear', authenticateToken, async (req, res) => {
  try {
    const { cartillaId } = req.params;
    const [cRows] = await pool.query("SELECT * FROM cartillas_cliente WHERE cartilla_id = ?", [cartillaId]);
    if (cRows.length === 0) return res.status(404).json({ error: "Cartilla no encontrada" });
    const cartilla = cRows[0];

    // Marcar como canjeada
    await pool.query(
      "UPDATE cartillas_cliente SET estado = 'Canjeada', fecha_canje = NOW() WHERE cartilla_id = ?",
      [cartillaId]
    );

    // Incrementar contador de tarjetas completadas en cliente
    await pool.query(
      "UPDATE clientes SET tarjeta_snack = tarjeta_snack + 1 WHERE cliente_id = ?",
      [cartilla.cliente_id]
    );

    // Crear la siguiente cartilla en curso
    const next = await ensureCartillaActiva(pool, cartilla.cliente_id);

    res.json({
      success: true,
      message: "¡Chifón gratis canjeado con éxito! Se ha iniciado una nueva cartilla.",
      nuevaCartilla: next.cartilla
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Anular / Vencer Cartilla y opcionalmente pasar a Cliente Preferente
router.post('/cartilla/:cartillaId/anular', authenticateToken, async (req, res) => {
  try {
    const { cartillaId } = req.params;
    const { cambiarAPreferente = false, motivo = 'Vencida por tiempo' } = req.body;

    const [cRows] = await pool.query("SELECT * FROM cartillas_cliente WHERE cartilla_id = ?", [cartillaId]);
    if (cRows.length === 0) return res.status(404).json({ error: "Cartilla no encontrada" });
    const cartilla = cRows[0];

    await pool.query(
      "UPDATE cartillas_cliente SET estado = 'Vencida', notas = ? WHERE cartilla_id = ?",
      [motivo, cartillaId]
    );

    if (cambiarAPreferente) {
      await pool.query("UPDATE clientes SET tipo_cartilla = 'Preferente' WHERE cliente_id = ?", [cartilla.cliente_id]);
    }

    // Iniciar nueva cartilla
    const next = await ensureCartillaActiva(pool, cartilla.cliente_id);

    res.json({
      success: true,
      message: cambiarAPreferente 
        ? "Cartilla anulada. El cliente ha sido cambiado a categoría Preferente."
        : "Cartilla anulada. Se ha generado una nueva cartilla.",
      nuevaCartilla: next.cartilla
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Cambiar tipo de cliente Snack ('Activo' <-> 'Preferente')
router.put('/cliente/:clienteId/tipo-cartilla', authenticateToken, async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { tipo } = req.body;
    if (!['Activo', 'Preferente'].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido. Debe ser 'Activo' o 'Preferente'" });
    }

    await pool.query("UPDATE clientes SET tipo_cartilla = ? WHERE cliente_id = ?", [tipo, clienteId]);

    // Actualizar también la cartilla activa en curso si existe
    const dias = tipo === 'Activo' ? 21 : 35;
    const dVence = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    await pool.query(
      "UPDATE cartillas_cliente SET tipo = ?, fecha_vencimiento = ? WHERE cliente_id = ? AND estado = 'EnCurso'",
      [tipo, getLocalDateString(dVence), clienteId]
    );

    res.json({ success: true, tipo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Historial detallado de movimientos de envases (para auditoría o control diario)
router.get('/movimientos', authenticateToken, async (req, res) => {
  try {
    const { cliente_id, fecha, limit = 50 } = req.query;
    let query = `
      SELECT ce.*, c.nombre as cliente_nombre 
      FROM control_envases ce
      JOIN clientes c ON ce.cliente_id = c.cliente_id
      WHERE 1=1
    `;
    const params = [];

    const userRol = String(req.user?.rol || '').toLowerCase();
    const isAdmin = userRol === 'administrador' || userRol === 'admin';
    if (!isAdmin && userRol === 'vendedor') {
      query += " AND (ce.usuario_id = ? OR ce.cliente_id IN (SELECT DISTINCT cliente_id FROM ventas WHERE usuario_id = ?)) ";
      params.push(req.user.id, req.user.id);
    }

    if (cliente_id) {
      query += " AND ce.cliente_id = ? ";
      params.push(cliente_id);
    }
    if (fecha) {
      query += " AND ce.fecha = ? ";
      params.push(fecha);
    }

    query += " ORDER BY ce.fecha DESC, ce.registro_id DESC LIMIT ? ";
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Eliminar un movimiento erróneo (deshacer)
router.delete('/movimientos/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM control_envases WHERE registro_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Sincronización inteligente de ventas pasadas a las cartillas
router.post('/sincronizar-ventas', authenticateToken, async (req, res) => {
  try {
    // Obtener todas las ventas de clientes Snack
    const [sales] = await pool.query(`
      SELECT v.venta_id, v.fecha, v.cliente_id, p.nombre as producto, p.sabor, dv.cantidad
      FROM ventas v
      JOIN detalle_venta dv ON v.venta_id = dv.venta_id
      JOIN productos p ON dv.producto_id = p.producto_id
      JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE c.categoria = 'Snack'
      ORDER BY v.fecha ASC, v.venta_id ASC
    `);

    let countSincronizados = 0;
    for (const s of sales) {
      const { cartilla } = await ensureCartillaActiva(pool, s.cliente_id);
      
      // Verificar si esta venta ya está asignada a algún slot
      const [assigned] = await pool.query(
        "SELECT * FROM cartilla_slots WHERE cartilla_id = ? AND venta_id = ?",
        [cartilla.cartilla_id, s.venta_id]
      );
      if (assigned.length > 0) continue;

      const saborAbrev = getSaborAbrev(s.sabor || s.producto);
      const cant = Number(s.cantidad || 1);

      for (let i = 0; i < cant; i++) {
        const [emptySlots] = await pool.query(
          "SELECT * FROM cartilla_slots WHERE cartilla_id = ? AND fecha_venta IS NULL ORDER BY slot_numero ASC LIMIT 1",
          [cartilla.cartilla_id]
        );
        if (emptySlots.length > 0) {
          const slot = emptySlots[0];
          await pool.query(
            "UPDATE cartilla_slots SET venta_id = ?, fecha_venta = ?, producto_nombre = ?, sabor_abrev = ? WHERE slot_id = ?",
            [s.venta_id, s.fecha, s.producto, saborAbrev, slot.slot_id]
          );
          await pool.query(
            "UPDATE cartillas_cliente SET chifones_acumulados = chifones_acumulados + 1 WHERE cartilla_id = ?",
            [cartilla.cartilla_id]
          );
          countSincronizados++;
        }
      }
    }

    res.json({ success: true, countSincronizados });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;