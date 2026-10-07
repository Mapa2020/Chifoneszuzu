import { pool } from './db.js';
import { getLocalDateString } from './dateUtils.js';

/**
 * Convierte el nombre o sabor de un producto en su abreviatura estándar
 * tal como se usa en las cartillas físicas de Chifones Zuzú (ej: CHC, Mrc, Nrj, L)
 */
export function getSaborAbrev(str = '') {
  const s = (str || '').toLowerCase();
  if (s.includes('chip')) return 'CHC';
  if (s.includes('maracuya') || s.includes('maracuyá')) return 'Mrc';
  if (s.includes('naranja')) return 'Nrj';
  if (s.includes('limon') || s.includes('limón')) return 'L';
  if (s.includes('oreo')) return 'O';
  if (s.includes('marmoleado') || s.includes('marmolado')) return 'CHM';
  if (s.includes('mani') || s.includes('maní')) return 'MN';
  if (s.includes('piña') || s.includes('pina')) return 'P';
  return (str || 'CHI').substring(0, 3).toUpperCase();
}

/**
 * Asegura que el cliente Snack tenga una cartilla activa en curso.
 * Si no tiene una, la crea y genera sus 10 slots vacíos.
 */
export async function ensureCartillaActiva(conn = pool, clienteId) {
  // 1. Obtener datos del cliente
  const [clRows] = await conn.query(
    "SELECT cliente_id, nombre, categoria, tipo_cartilla FROM clientes WHERE cliente_id = ?",
    [clienteId]
  );
  if (clRows.length === 0) throw new Error("Cliente no encontrado");
  const cliente = clRows[0];

  // 2. Buscar cartilla activa 'EnCurso'
  const [cartillas] = await conn.query(
    "SELECT * FROM cartillas_cliente WHERE cliente_id = ? AND estado = 'EnCurso' ORDER BY cartilla_id DESC LIMIT 1",
    [clienteId]
  );

  if (cartillas.length > 0) {
    const cartilla = cartillas[0];
    const [slots] = await conn.query(
      "SELECT * FROM cartilla_slots WHERE cartilla_id = ? ORDER BY slot_numero ASC",
      [cartilla.cartilla_id]
    );
    // Si por alguna razón faltan slots, crearlos
    if (slots.length < 10) {
      for (let i = slots.length + 1; i <= 10; i++) {
        await conn.query(
          "INSERT IGNORE INTO cartilla_slots (cartilla_id, slot_numero) VALUES (?, ?)",
          [cartilla.cartilla_id, i]
        );
      }
    }
    return { cartilla, cliente };
  }

  // 3. Si no existe, crear nueva cartilla
  // Contar cuántas cartillas ha tenido para generar el correlativo (ej: 01/26, 02/26, 19/26)
  const [totalPrev] = await conn.query(
    "SELECT COUNT(*) as count FROM cartillas_cliente WHERE cliente_id = ?",
    [clienteId]
  );
  const correlativo = totalPrev[0].count + 1;
  const currentYearShort = String(new Date().getFullYear()).slice(-2);
  const numeroCartilla = `${String(correlativo).padStart(2, '0')}/${currentYearShort}`;

  const tipo = cliente.tipo_cartilla || 'Activo';
  const fechaInicio = getLocalDateString();
  
  // Vencimiento: Activo = 3 semanas (21 días), Preferente = 5 semanas (35 días)
  const dInicio = new Date();
  const diasVencimiento = tipo === 'Activo' ? 21 : 35;
  const dVence = new Date(dInicio.getTime() + diasVencimiento * 24 * 60 * 60 * 1000);
  const fechaVencimiento = getLocalDateString(dVence);

  const [res] = await conn.query(
    `INSERT INTO cartillas_cliente 
     (cliente_id, numero_cartilla, tipo, fecha_inicio, fecha_vencimiento, estado, chifones_acumulados, envases_devueltos) 
     VALUES (?, ?, ?, ?, ?, 'EnCurso', 0, 0)`,
    [clienteId, numeroCartilla, tipo, fechaInicio, fechaVencimiento]
  );
  const cartillaId = res.insertId;

  // Crear 10 slots vacíos
  for (let i = 1; i <= 10; i++) {
    await conn.query(
      "INSERT INTO cartilla_slots (cartilla_id, slot_numero) VALUES (?, ?)",
      [cartillaId, i]
    );
  }

  const [nuevaCartilla] = await conn.query(
    "SELECT * FROM cartillas_cliente WHERE cartilla_id = ?",
    [cartillaId]
  );

  return { cartilla: nuevaCartilla[0], cliente };
}

/**
 * Registra en control_envases y llena los slots de cartilla cuando se realiza una venta a un cliente Snack
 */
export async function registrarEntregaVenta(conn, clienteId, ventaId, fechaVenta, detalles, usuarioId = null) {
  // Verificar si el cliente es de categoría Snack
  const [cl] = await conn.query("SELECT categoria FROM clientes WHERE cliente_id = ?", [clienteId]);
  if (!cl[0] || cl[0].categoria !== 'Snack') return;

  // Calcular total de chifones entregados
  let totalChifones = 0;
  for (const d of detalles) {
    totalChifones += Number(d.cantidad || 0);
  }
  if (totalChifones <= 0) return;

  // 1. Registrar movimiento en control_envases
  await conn.query(
    `INSERT INTO control_envases (cliente_id, usuario_id, fecha, tipo, cantidad, venta_id, condicion, ciclo_uso, observaciones)
     VALUES (?, ?, ?, 'Entrega', ?, ?, 'Sano', 1, 'Entrega en venta #${ventaId}')`,
    [clienteId, usuarioId, fechaVenta, totalChifones, ventaId]
  );

  // 2. Asignar cada chifón a los slots de la cartilla activa
  for (const d of detalles) {
    const cant = Number(d.cantidad || 0);
    // Obtener datos del producto para saber el sabor
    const [pRows] = await conn.query("SELECT nombre, sabor FROM productos WHERE producto_id = ?", [d.producto_id]);
    const prod = pRows[0] || { nombre: 'Chifon', sabor: '' };
    const saborAbrev = getSaborAbrev(prod.sabor || prod.nombre);

    for (let u = 0; u < cant; u++) {
      let { cartilla } = await ensureCartillaActiva(conn, clienteId);

      // Buscar el primer slot vacío
      let [emptySlots] = await conn.query(
        "SELECT * FROM cartilla_slots WHERE cartilla_id = ? AND fecha_venta IS NULL ORDER BY slot_numero ASC LIMIT 1",
        [cartilla.cartilla_id]
      );

      // Si no hay slots vacíos en esta cartilla, la completamos y abrimos la siguiente
      if (emptySlots.length === 0) {
        await conn.query(
          "UPDATE cartillas_cliente SET estado = 'Completada', chifones_acumulados = 10 WHERE cartilla_id = ?",
          [cartilla.cartilla_id]
        );
        const next = await ensureCartillaActiva(conn, clienteId);
        cartilla = next.cartilla;
        [emptySlots] = await conn.query(
          "SELECT * FROM cartilla_slots WHERE cartilla_id = ? AND fecha_venta IS NULL ORDER BY slot_numero ASC LIMIT 1",
          [cartilla.cartilla_id]
        );
      }

      if (emptySlots.length > 0) {
        const slot = emptySlots[0];
        await conn.query(
          `UPDATE cartilla_slots 
           SET venta_id = ?, fecha_venta = ?, producto_nombre = ?, sabor_abrev = ?, envase_devuelto = 0 
           WHERE slot_id = ?`,
          [ventaId, fechaVenta, prod.nombre, saborAbrev, slot.slot_id]
        );
        await conn.query(
          "UPDATE cartillas_cliente SET chifones_acumulados = chifones_acumulados + 1 WHERE cartilla_id = ?",
          [cartilla.cartilla_id]
        );
      }
    }
  }
}

/**
 * Registra devolución manual de envases devueltos por el cliente al regresar de las entregas
 */
export async function registrarDevolucion(connOrPool = pool, { clienteId, cantidad, fecha, condicion = 'Sano', observaciones = '', usuarioId = null }) {
  const conn = connOrPool;
  const cantDev = parseInt(cantidad, 10);
  if (!cantDev || cantDev <= 0) throw new Error("La cantidad debe ser mayor a 0");
  const fechaDev = fecha || getLocalDateString();

  // 1. Insertar registro en control_envases
  await conn.query(
    `INSERT INTO control_envases (cliente_id, usuario_id, fecha, tipo, cantidad, condicion, observaciones)
     VALUES (?, ?, ?, 'Devolucion', ?, ?, ?)`,
    [clienteId, usuarioId, fechaDev, cantDev, condicion, observaciones || 'Devolución manual diaria']
  );

  // 2. Si están sanos, vincular con los slots de la cartilla activa que aún no tengan envase devuelto
  const { cartilla } = await ensureCartillaActiva(conn, clienteId);

  // Obtener slots que tienen venta pero aún no tienen retorno de envase
  const [slotsPendientes] = await conn.query(
    `SELECT * FROM cartilla_slots 
     WHERE cartilla_id = ? AND fecha_venta IS NOT NULL AND (envase_devuelto = 0 OR envase_devuelto IS NULL)
     ORDER BY slot_numero ASC LIMIT ${cantDev}`,
    [cartilla.cartilla_id]
  );

  for (const slot of slotsPendientes) {
    await conn.query(
      "UPDATE cartilla_slots SET envase_devuelto = 1, fecha_devolucion = ? WHERE slot_id = ?",
      [fechaDev, slot.slot_id]
    );
  }

  // Actualizar contador de envases devueltos en la cartilla
  const [countDev] = await conn.query(
    "SELECT COUNT(*) as cnt FROM cartilla_slots WHERE cartilla_id = ? AND envase_devuelto = 1",
    [cartilla.cartilla_id]
  );
  await conn.query(
    "UPDATE cartillas_cliente SET envases_devueltos = ? WHERE cartilla_id = ?",
    [countDev[0].cnt, cartilla.cartilla_id]
  );

  return {
    success: true,
    slotsActualizados: slotsPendientes.length,
    totalDevueltosCartilla: countDev[0].cnt
  };
}

/**
 * Obtiene toda la información completa de la cartilla visual para un cliente
 */
export async function obtenerCartillaCliente(connOrPool = pool, clienteId) {
  const { cartilla, cliente } = await ensureCartillaActiva(connOrPool, clienteId);

  const [slots] = await connOrPool.query(
    "SELECT * FROM cartilla_slots WHERE cartilla_id = ? ORDER BY slot_numero ASC",
    [cartilla.cartilla_id]
  );

  // Balance histórico de envases del cliente
  const [balanceRows] = await connOrPool.query(`
    SELECT 
      IFNULL(SUM(CASE WHEN tipo = 'Entrega' THEN cantidad ELSE 0 END), 0) as totalEntregados,
      IFNULL(SUM(CASE WHEN tipo = 'Devolucion' THEN cantidad ELSE 0 END), 0) as totalDevueltos,
      IFNULL(SUM(CASE WHEN tipo = 'Baja' THEN cantidad ELSE 0 END), 0) as totalBaja
    FROM control_envases 
    WHERE cliente_id = ?
  `, [clienteId]);

  const bal = balanceRows[0] || { totalEntregados: 0, totalDevueltos: 0, totalBaja: 0 };
  const envasesPendientes = Number(bal.totalEntregados) - Number(bal.totalDevueltos) - Number(bal.totalBaja);

  // Historial de cartillas anteriores
  const [historialCartillas] = await connOrPool.query(
    "SELECT * FROM cartillas_cliente WHERE cliente_id = ? AND cartilla_id != ? ORDER BY cartilla_id DESC LIMIT 5",
    [clienteId, cartilla.cartilla_id]
  );

  // Reglas y elegibilidad de premio
  const chifonesCompletados = slots.filter(s => s.fecha_venta !== null).length;
  const envasesDevueltos = slots.filter(s => s.envase_devuelto === 1).length;
  const isActivo = cartilla.tipo === 'Activo';
  
  // Puede canjear si: tiene 10 chifones Y 10 envases devueltos Y es Activo (para chifón gratis)
  const canjeDisponible = chifonesCompletados >= 10 && envasesDevueltos >= 10 && isActivo;

  return {
    cliente,
    cartilla: {
      ...cartilla,
      chifones_acumulados: chifonesCompletados,
      envases_devueltos: envasesDevueltos
    },
    slots,
    balance: {
      totalEntregados: Number(bal.totalEntregados),
      totalDevueltos: Number(bal.totalDevueltos),
      totalBaja: Number(bal.totalBaja),
      pendientes: Math.max(0, envasesPendientes)
    },
    canjeDisponible,
    historialCartillas
  };
}

/**
 * Resumen global del módulo de contenedores
 */
export async function obtenerResumenContenedores(connOrPool = pool, user = null) {
  const userRol = String(user?.rol || '').toLowerCase();
  const isAdmin = userRol === 'administrador' || userRol === 'admin';
  const isVendedor = !isAdmin && userRol === 'vendedor';
  const userId = user?.id;

  let totalesQuery = `
    SELECT 
      IFNULL(SUM(CASE WHEN ce.tipo = 'Entrega' THEN ce.cantidad ELSE 0 END), 0) as totalEntregados,
      IFNULL(SUM(CASE WHEN ce.tipo = 'Devolucion' THEN ce.cantidad ELSE 0 END), 0) as totalDevueltos,
      IFNULL(SUM(CASE WHEN ce.tipo = 'Baja' THEN ce.cantidad ELSE 0 END), 0) as totalBaja,
      IFNULL(SUM(CASE WHEN ce.tipo = 'Devolucion' AND DATE(ce.fecha) = CURDATE() THEN ce.cantidad ELSE 0 END), 0) as devueltosHoy
    FROM control_envases ce
  `;
  let totalesParams = [];

  if (isVendedor) {
    totalesQuery += `
      WHERE ce.usuario_id = ? 
         OR ce.cliente_id IN (SELECT DISTINCT cliente_id FROM ventas WHERE usuario_id = ?)
    `;
    totalesParams.push(userId, userId);
  }

  const [totales] = await connOrPool.query(totalesQuery, totalesParams);

  const t = totales[0] || {};
  const enCirculacion = Math.max(0, Number(t.totalEntregados) - Number(t.totalDevueltos) - Number(t.totalBaja));

  // Clientes Snack con balance de envases y estado de cartilla
  let clientesQuery = `
    SELECT 
      c.cliente_id, 
      c.nombre, 
      c.telefono, 
      c.direccion, 
      c.zona,
      COALESCE(c.tipo_cartilla, 'Activo') as tipo_cartilla,
      COALESCE(e.entregados, 0) as entregados_total,
      COALESCE(e.devueltos, 0) as devueltos_total,
      GREATEST(0, COALESCE(e.entregados, 0) - COALESCE(e.devueltos, 0) - COALESCE(e.bajas, 0)) as pendientes_actual,
      cart.cartilla_id,
      cart.numero_cartilla,
      cart.tipo as cartilla_tipo,
      cart.fecha_inicio,
      cart.fecha_vencimiento,
      cart.estado as cartilla_estado,
      COALESCE(cart.chifones_acumulados, 0) as chifones_acumulados,
      COALESCE(cart.envases_devueltos, 0) as envases_devueltos
    FROM clientes c
    LEFT JOIN (
      SELECT 
        cliente_id,
        SUM(CASE WHEN tipo = 'Entrega' THEN cantidad ELSE 0 END) as entregados,
        SUM(CASE WHEN tipo = 'Devolucion' THEN cantidad ELSE 0 END) as devueltos,
        SUM(CASE WHEN tipo = 'Baja' THEN cantidad ELSE 0 END) as bajas
      FROM control_envases
      ${isVendedor ? 'WHERE usuario_id = ? OR cliente_id IN (SELECT DISTINCT cliente_id FROM ventas WHERE usuario_id = ?)' : ''}
      GROUP BY cliente_id
    ) e ON c.cliente_id = e.cliente_id
    LEFT JOIN (
      SELECT cc.* 
      FROM cartillas_cliente cc
      INNER JOIN (
        SELECT cliente_id, MAX(cartilla_id) as max_id 
        FROM cartillas_cliente 
        GROUP BY cliente_id
      ) m ON cc.cartilla_id = m.max_id
    ) cart ON c.cliente_id = cart.cliente_id
    WHERE c.categoria = 'Snack'
    ${isVendedor ? 'AND (c.cliente_id IN (SELECT DISTINCT cliente_id FROM ventas WHERE usuario_id = ?) OR c.cliente_id IN (SELECT DISTINCT cliente_id FROM control_envases WHERE usuario_id = ?))' : ''}
    ORDER BY pendientes_actual DESC, c.nombre ASC
  `;

  let clientesParams = [];
  if (isVendedor) {
    clientesParams.push(userId, userId, userId, userId);
  }

  const [clientes] = await connOrPool.query(clientesQuery, clientesParams);

  return {
    estadisticas: {
      enCirculacion,
      devueltosHoy: Number(t.devueltosHoy || 0),
      dadosDeBaja: Number(t.totalBaja || 0),
      totalClientesSnack: clientes.length
    },
    clientes
  };
}
