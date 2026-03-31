import express from 'express';
import { pool } from './db.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

// 1. Estadísticas rápidas para el Dashboard
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [sales] = await pool.query('SELECT SUM(total) as total FROM ventas WHERE fecha = ?', [today]);
    const [expenses] = await pool.query('SELECT SUM(monto) as total FROM egresos WHERE fecha = ?', [today]);
    const [lowStock] = await pool.query('SELECT COUNT(*) as count FROM ingredientes WHERE stock_actual <= stock_minimo');
    const [lowStockItems] = await pool.query('SELECT nombre, stock_actual, unidad_medida FROM ingredientes WHERE stock_actual <= stock_minimo LIMIT 5');
    const [pending] = await pool.query("SELECT COUNT(*) as count FROM contenedores WHERE estado = 'EnUso'");

    res.json({
      salesToday: sales[0].total || 0,
      expensesToday: expenses[0].total || 0,
      lowStockCount: lowStock[0].count,
      lowStockItems: lowStockItems || [],
      pendingContainers: pending[0].count || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Reporte Mensual Detallado (Solo Admin)
router.get('/reportes/monthly/:year/:month', authenticateToken, authorizeRole(['Administrador']), async (req, res) => {
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

    // Gastos por Categoría
    const [expensesByCategory] = await pool.query(
      'SELECT tipo, SUM(monto) as total FROM egresos WHERE YEAR(fecha) = ? AND MONTH(fecha) = ? GROUP BY tipo',
      [year, month]
    );

    // Ventas Diarias (para gráficos)
    const [dailySales] = await pool.query(
      'SELECT fecha, SUM(total) as total FROM ventas WHERE YEAR(fecha) = ? AND MONTH(fecha) = ? GROUP BY fecha ORDER BY fecha ASC',
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

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      totalSales,
      totalExpenses,
      netUtility: totalSales - totalExpenses,
      details: {
        salesCount: salesResult[0].countSales,
        expensesCount: expensesResult[0].countExpenses,
        expensesByCategory,
        dailySales,
        productPerformance
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;