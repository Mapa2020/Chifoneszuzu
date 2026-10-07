import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';
import { getLocalDateString } from './dateUtils.js';

const router = express.Router();

// 1. Estadísticas rápidas para el Dashboard
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    let today = req.query.fecha;
    if (!today) {
      const [cur] = await pool.query('SELECT CAST(CURDATE() AS CHAR) as today');
      today = cur[0]?.today || getLocalDateString();
    }
    const [yearStr, monthStr] = today.split('-');
    const currentYear = parseInt(yearStr, 10);
    const currentMonth = parseInt(monthStr, 10);
    const userRol = String(req.user?.rol || '').toLowerCase();
    const isAdmin = userRol === 'administrador' || userRol === 'admin';
    const userId = req.user?.id;

    // 1. Ventas del día
    let salesQuery = 'SELECT SUM(total) as total FROM ventas WHERE DATE(fecha) = ?';
    let salesParams = [today];

    if (!isAdmin) {
      if (userRol === 'vendedor') {
        salesQuery += ' AND usuario_id = ?';
        salesParams.push(userId);
      } else if (userRol === 'cliente') {
        salesQuery += ' AND cliente_id = (SELECT cliente_id FROM usuarios WHERE usuario_id = ?)';
        salesParams.push(userId);
      }
    }
    
    const [sales] = await pool.query(salesQuery, salesParams);
    const [expenses] = await pool.query('SELECT SUM(monto) as total FROM egresos WHERE DATE(fecha) = ?', [today]);

    // Gastos del día por ámbito
    const [expensesTodayByAmbito] = await pool.query(`
      SELECT 
        IFNULL(SUM(CASE WHEN ambito = 'Proceso' THEN monto ELSE 0 END), 0) as proceso,
        IFNULL(SUM(CASE WHEN ambito = 'Personal' THEN monto ELSE 0 END), 0) as personal,
        IFNULL(SUM(CASE WHEN ambito = 'Casa' THEN monto ELSE 0 END), 0) as casa
      FROM egresos WHERE DATE(fecha) = ?
    `, [today]);

    // 2. Métricas del Mes (Modelo Financiero 70/30)
    let salesMonthQuery = 'SELECT IFNULL(SUM(total), 0) as total FROM ventas WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?';
    let salesMonthParams = [currentYear, currentMonth];
    if (!isAdmin) {
      if (userRol === 'vendedor') {
        salesMonthQuery += ' AND usuario_id = ?';
        salesMonthParams.push(userId);
      } else if (userRol === 'cliente') {
        salesMonthQuery += ' AND cliente_id = (SELECT cliente_id FROM usuarios WHERE usuario_id = ?)';
        salesMonthParams.push(userId);
      }
    }
    const [salesMonth] = await pool.query(salesMonthQuery, salesMonthParams);

    const [expensesMonthByAmbito] = await pool.query(`
      SELECT 
        IFNULL(SUM(CASE WHEN ambito = 'Proceso' THEN monto ELSE 0 END), 0) as proceso,
        IFNULL(SUM(CASE WHEN ambito = 'Personal' THEN monto ELSE 0 END), 0) as personal,
        IFNULL(SUM(CASE WHEN ambito = 'Casa' THEN monto ELSE 0 END), 0) as casa,
        IFNULL(SUM(monto), 0) as total
      FROM egresos WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?
    `, [currentYear, currentMonth]);

    const totalIngresosMes = parseFloat(salesMonth[0].total) || 0;
    const fondoOperativo70 = totalIngresosMes * 0.70;
    const gastosProcesoMes = parseFloat(expensesMonthByAmbito[0].proceso) || 0;
    const gastosPersonalMes = parseFloat(expensesMonthByAmbito[0].personal) || 0;
    const saldoOperativoMes = fondoOperativo70 - gastosProcesoMes - gastosPersonalMes;

    const utilidades30Mes = totalIngresosMes * 0.30;
    const gastosCasaMes = parseFloat(expensesMonthByAmbito[0].casa) || 0;
    const saldoUtilidadesMes = utilidades30Mes - gastosCasaMes;
    const saldoTotalMes = saldoOperativoMes + saldoUtilidadesMes;

    // 3. Ventas pendientes de cobro (Créditos del Día)
    let pendientesQuery = `
      SELECT v.venta_id, v.fecha, v.hora, v.total, v.forma_pago, v.estado_pago,
             c.cliente_id, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
             u.username as vendedor_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      LEFT JOIN usuarios u ON v.usuario_id = u.usuario_id
      WHERE v.estado_pago = 'Pendiente'
    `;
    let pendientesParams = [];

    if (!isAdmin) {
      if (userRol === 'vendedor') {
        pendientesQuery += ' AND v.usuario_id = ?';
        pendientesParams.push(userId);
      } else if (userRol === 'cliente') {
        pendientesQuery += ' AND v.cliente_id = (SELECT cliente_id FROM usuarios WHERE usuario_id = ?)';
        pendientesParams.push(userId);
      }
    }

    pendientesQuery += ' ORDER BY v.fecha DESC, v.hora DESC';
    const [pendientes] = await pool.query(pendientesQuery, pendientesParams);

    const totalPendiente = pendientes.reduce((acc, p) => acc + parseFloat(p.total || 0), 0);

    // 4. Inventario y Contenedores
    const [lowStock] = await pool.query('SELECT COUNT(*) as count FROM ingredientes WHERE stock_actual <= stock_minimo');
    const [lowStockItems] = await pool.query('SELECT nombre, stock_actual, unidad_medida FROM ingredientes WHERE stock_actual <= stock_minimo LIMIT 5');
    
    let pendingContainersCount = 0;
    if (!isAdmin && userRol === 'vendedor') {
      const [pRows] = await pool.query(`
        SELECT 
          GREATEST(0, IFNULL(SUM(CASE WHEN ce.tipo = 'Entrega' THEN ce.cantidad ELSE 0 END), 0) -
                      IFNULL(SUM(CASE WHEN ce.tipo = 'Devolucion' THEN ce.cantidad ELSE 0 END), 0) -
                      IFNULL(SUM(CASE WHEN ce.tipo = 'Baja' THEN ce.cantidad ELSE 0 END), 0)) as count
        FROM control_envases ce
        WHERE ce.usuario_id = ? 
           OR ce.cliente_id IN (SELECT DISTINCT cliente_id FROM ventas WHERE usuario_id = ?)
      `, [userId, userId]);
      pendingContainersCount = Number(pRows[0]?.count || 0);
    } else {
      const [pRows] = await pool.query(`
        SELECT 
          GREATEST(0, IFNULL(SUM(CASE WHEN tipo = 'Entrega' THEN cantidad ELSE 0 END), 0) -
                      IFNULL(SUM(CASE WHEN tipo = 'Devolucion' THEN cantidad ELSE 0 END), 0) -
                      IFNULL(SUM(CASE WHEN tipo = 'Baja' THEN cantidad ELSE 0 END), 0)) as count
        FROM control_envases
      `);
      pendingContainersCount = Number(pRows[0]?.count || 0);
    }

    const isVendedor = !isAdmin && userRol === 'vendedor';

    res.json({
      salesToday: parseFloat(sales[0].total) || 0,
      expensesToday: isVendedor ? 0 : (parseFloat(expenses[0].total) || 0),
      expensesTodayDetails: {
        proceso: isVendedor ? 0 : (parseFloat(expensesTodayByAmbito[0].proceso) || 0),
        personal: isVendedor ? 0 : (parseFloat(expensesTodayByAmbito[0].personal) || 0),
        casa: isVendedor ? 0 : (parseFloat(expensesTodayByAmbito[0].casa) || 0)
      },
      // Resumen Financiero 70/30 del Mes
      finanzasMes: {
        totalIngresosMes,
        fondoOperativo70: isVendedor ? 0 : fondoOperativo70,
        gastosProcesoMes: isVendedor ? 0 : gastosProcesoMes,
        gastosPersonalMes: isVendedor ? 0 : gastosPersonalMes,
        saldoOperativoMes: isVendedor ? 0 : saldoOperativoMes,
        utilidades30Mes: isVendedor ? 0 : utilidades30Mes,
        gastosCasaMes: isVendedor ? 0 : gastosCasaMes,
        saldoUtilidadesMes: isVendedor ? 0 : saldoUtilidadesMes,
        saldoTotalMes: isVendedor ? totalIngresosMes : saldoTotalMes,
        totalGastosMes: isVendedor ? 0 : (parseFloat(expensesMonthByAmbito[0].total) || 0)
      },
      // Alerta de Cobranzas
      cobranzas: {
        countPendientes: pendientes.length,
        totalPendiente,
        pendientes
      },
      lowStockCount: lowStock[0].count,
      lowStockItems: lowStockItems || [],
      pendingContainers: pendingContainersCount
    });
  } catch (error) {
    console.error("Error al obtener stats del dashboard:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Reporte Mensual Detallado (Solo Admin)
router.get('/reportes/monthly/:year/:month', authenticateToken, authorizeRole(['Administrador', 'Admin']), async (req, res) => {
  const { year, month } = req.params;
  try {
    // Resumen de Ventas
    const [salesResult] = await pool.query(
      'SELECT IFNULL(SUM(total), 0) as totalSales, COUNT(*) as countSales FROM ventas WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?',
      [year, month]
    );

    // Resumen de Gastos
    const [expensesResult] = await pool.query(
      'SELECT IFNULL(SUM(monto), 0) as totalExpenses, COUNT(*) as countExpenses FROM egresos WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?',
      [year, month]
    );

    // Gastos por Ámbito (Proceso, Personal, Casa)
    const [expensesByAmbito] = await pool.query(`
      SELECT 
        ambito,
        IFNULL(SUM(monto), 0) as total,
        COUNT(*) as count
      FROM egresos 
      WHERE YEAR(fecha) = ? AND MONTH(fecha) = ? 
      GROUP BY ambito
    `, [year, month]);

    // Gastos por Categoría
    const [expensesByCategory] = await pool.query(
      'SELECT categoria, ambito, SUM(monto) as total FROM egresos WHERE YEAR(fecha) = ? AND MONTH(fecha) = ? GROUP BY categoria, ambito ORDER BY total DESC',
      [year, month]
    );

    // Ventas Diarias (para gráficos)
    const [dailySales] = await pool.query(
      'SELECT CAST(fecha AS CHAR) as fecha, SUM(total) as total FROM ventas WHERE YEAR(fecha) = ? AND MONTH(fecha) = ? GROUP BY fecha ORDER BY fecha ASC',
      [year, month]
    );

    // Egresos Diarios (para gráficos)
    const [dailyExpenses] = await pool.query(
      'SELECT CAST(fecha AS CHAR) as fecha, SUM(monto) as total FROM egresos WHERE YEAR(fecha) = ? AND MONTH(fecha) = ? GROUP BY fecha ORDER BY fecha ASC',
      [year, month]
    );

    // Rendimiento por Producto
    const [productPerformance] = await pool.query(
      `SELECT p.nombre, SUM(dv.cantidad) as totalQty, SUM(dv.subtotal) as totalRevenue 
       FROM detalle_venta dv 
       JOIN productos p ON dv.producto_id = p.producto_id 
       JOIN ventas v ON dv.venta_id = v.venta_id 
       WHERE YEAR(v.fecha) = ? AND MONTH(v.fecha) = ? 
       GROUP BY p.producto_id 
       ORDER BY totalRevenue DESC`,
      [year, month]
    );

    const totalSales = parseFloat(salesResult[0].totalSales);
    const totalExpenses = parseFloat(expensesResult[0].totalExpenses);

    const fondoOperativo70 = totalSales * 0.70;
    const utilidades30 = totalSales * 0.30;

    const procesoMap = expensesByAmbito.find(e => e.ambito === 'Proceso')?.total || 0;
    const personalMap = expensesByAmbito.find(e => e.ambito === 'Personal')?.total || 0;
    const casaMap = expensesByAmbito.find(e => e.ambito === 'Casa')?.total || 0;

    const saldoOperativo = fondoOperativo70 - parseFloat(procesoMap) - parseFloat(personalMap);
    const saldoUtilidades = utilidades30 - parseFloat(casaMap);

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      totalSales,
      totalExpenses,
      netUtility: totalSales - totalExpenses,
      modelo7030: {
        fondoOperativo70,
        gastosProceso: parseFloat(procesoMap),
        gastosPersonal: parseFloat(personalMap),
        saldoOperativo,
        utilidades30,
        gastosCasa: parseFloat(casaMap),
        saldoUtilidades,
        saldoTotal: saldoOperativo + saldoUtilidades
      },
      details: {
        salesCount: salesResult[0].countSales,
        expensesCount: expensesResult[0].countExpenses,
        expensesByAmbito,
        expensesByCategory,
        dailySales,
        dailyExpenses,
        productPerformance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper para extraer nombre corto o alias de despacho
function getShortClientName(fullName = '') {
  const clean = fullName.trim();
  if (!clean) return 'Cliente';
  if (/Derecho/i.test(clean)) return 'Derecho';
  if (/Combito/i.test(clean)) return 'Combito';
  const parts = clean.split(/\s+/);
  return parts[0];
}

// 3. Resumen Diario de Despacho y Reparto (para WhatsApp Familia ZUZÚ)
router.get('/reportes/despacho', authenticateToken, async (req, res) => {
  try {
    let fecha = req.query.fecha;
    if (!fecha) {
      const [cur] = await pool.query('SELECT CAST(CURDATE() AS CHAR) as today');
      fecha = cur[0]?.today || getLocalDateString();
    }

    const userRol = String(req.user?.rol || '').toLowerCase();
    const isAdmin = userRol === 'administrador' || userRol === 'admin';
    let queryDespacho = `
      SELECT 
        v.venta_id,
        v.total as venta_total,
        COALESCE(c.cliente_id, 0) as cliente_id,
        COALESCE(c.nombre, 'Venta Directa') as cliente_nombre,
        c.direccion,
        COALESCE(c.zona, 'OTROS') as zona,
        dv.producto_id,
        dv.cantidad,
        dv.subtotal,
        p.nombre as producto_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      LEFT JOIN detalle_venta dv ON v.venta_id = dv.venta_id
      LEFT JOIN productos p ON dv.producto_id = p.producto_id
      WHERE v.fecha = ?
    `;
    let paramsDespacho = [fecha];

    if (!isAdmin) {
      if (userRol === 'vendedor') {
        queryDespacho += " AND v.usuario_id = ? ";
        paramsDespacho.push(req.user.id);
      } else if (userRol === 'cliente') {
        queryDespacho += " AND v.cliente_id = (SELECT cliente_id FROM usuarios WHERE usuario_id = ?) ";
        paramsDespacho.push(req.user.id);
      }
    }

    queryDespacho += ` ORDER BY c.zona ASC, v.venta_id ASC`;

    const [salesDetails] = await pool.query(queryDespacho, paramsDespacho);

    const zonasMap = {};
    let totalVentas = 0;
    let totalUnidades = 0;

    salesDetails.forEach(row => {
      const zonaName = (row.zona || 'OTROS').toUpperCase().trim();
      if (!zonasMap[zonaName]) {
        zonasMap[zonaName] = {
          zona: zonaName,
          totalMonto: 0,
          totalUnidades: 0,
          pedidos: {}
        };
      }

      const clientKey = row.cliente_id ? String(row.cliente_id) : row.cliente_nombre;
      if (!zonasMap[zonaName].pedidos[clientKey]) {
        zonasMap[zonaName].pedidos[clientKey] = {
          cliente_id: row.cliente_id,
          cliente_nombre: row.cliente_nombre,
          nombre_despacho: getShortClientName(row.cliente_nombre),
          direccion: row.direccion,
          min_venta_id: row.venta_id,
          total_monto: 0,
          total_unidades: 0,
          detalles: []
        };
      }

      const cant = Number(row.cantidad || 0);
      const sub = Number(row.subtotal || 0);

      zonasMap[zonaName].pedidos[clientKey].total_unidades += cant;
      zonasMap[zonaName].pedidos[clientKey].total_monto += sub;
      if (row.producto_nombre) {
        zonasMap[zonaName].pedidos[clientKey].detalles.push({
          producto_nombre: row.producto_nombre,
          cantidad: cant,
          subtotal: sub
        });
      }

      zonasMap[zonaName].totalUnidades += cant;
      zonasMap[zonaName].totalMonto += sub;
      totalUnidades += cant;
      totalVentas += sub;
    });

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const [y, m, d] = fecha.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const diaNombre = diasSemana[dateObj.getDay()];
    const shortYear = String(y).slice(-2);
    const fechaFormateada = `${diaNombre} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${shortYear}`;

    const zonasList = Object.values(zonasMap).map(z => ({
      zona: z.zona,
      totalMonto: z.totalMonto,
      totalUnidades: z.totalUnidades,
      pedidos: Object.values(z.pedidos).sort((a, b) => (a.min_venta_id || 0) - (b.min_venta_id || 0))
    }));

    zonasList.sort((a, b) => {
      const order = { 'RAMADA': 1, 'U.A.G.R.M': 2 };
      const valA = order[a.zona] || 99;
      const valB = order[b.zona] || 99;
      return valA - valB;
    });

    let msg = `Resumen\n\nFecha: ${fechaFormateada}\n\n`;

    zonasList.forEach(z => {
      msg += `${z.zona}\n`;
      z.pedidos.forEach(p => {
        const left = `${p.total_unidades} ${p.nombre_despacho}`;
        const montoStr = Math.round(p.total_monto) === p.total_monto ? p.total_monto : Number(p.total_monto).toFixed(1);
        const right = `bs ${montoStr}`;
        const dots = '.'.repeat(Math.max(4, 22 - left.length - right.length));
        msg += `${left}${dots} ${right}\n`;
      });
      msg += '\n';
    });

    const inversion70 = totalVentas * 0.70;
    const casa30 = totalVentas * 0.30;

    msg += 'xxxxxxxxxxxxxxxxxxxxxxxxxx\n\n';
    msg += `TOTAL:  bs ${Math.round(totalVentas) === totalVentas ? totalVentas : totalVentas.toFixed(1)}\n`;
    msg += `UNID: ${totalUnidades}\n`;
    msg += `INV(70%):      ${inversion70.toFixed(1).replace('.', ',')} bs\n`;
    msg += `CASA(30%):  ${casa30.toFixed(1).replace('.', ',')} bs`;

    res.json({
      fecha,
      fechaFormateada,
      totalVentas,
      totalUnidades,
      inversion70,
      casa30,
      zonas: zonasList,
      mensajeWhatsapp: msg
    });
  } catch (error) {
    console.error("Error al generar resumen de despacho:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;