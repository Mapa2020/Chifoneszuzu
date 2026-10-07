import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PieChart,
  ShieldAlert,
  Users,
  Calculator,
  ArrowRightLeft,
  Info
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../authcontext';
import { MonthlyReportData, Venta, Cliente } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ReporteMensual() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [ventasMes, setVentasMes] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Parámetros de simulación de rentabilidad
  const [porciones, setPorciones] = useState(16);
  const [precioPorcion, setPrecioPorcion] = useState(6);
  
  const [selectedDate, setSelectedDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${user?.token}` };
        
        const [repRes, ventRes, cliRes] = await Promise.all([
          fetch(`/api/reportes/monthly/${selectedDate.year}/${selectedDate.month}`, { headers }),
          fetch('/api/ventas', { headers }),
          fetch('/api/clientes', { headers })
        ]);

        const reportData = await repRes.json();
        const allVentas = await ventRes.json();
        const allClientes = await cliRes.json();

        setReport(reportData);
        setClientes(allClientes);
        
        // Filtrar ventas del mes seleccionado localmente para la tabla de clientes
        const filtered = allVentas.filter((v: Venta) => {
          const parts = String(v.fecha).split('T')[0].split('-');
          if (parts.length === 3) {
            return parseInt(parts[0], 10) === selectedDate.year && parseInt(parts[1], 10) === selectedDate.month;
          }
          const d = new Date(v.fecha);
          return d.getFullYear() === selectedDate.year && (d.getMonth() + 1) === selectedDate.month;
        });
        setVentasMes(filtered);

      } catch (error: any) {
        console.error("Error al cargar reporte:", error);
        toast.error(error.message);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      fetchReport();
    }
  }, [selectedDate, user?.token]);

  // Procesar datos de clientes para la tabla de rentabilidad
  const performanceClientes = useMemo(() => {
    const stats: Record<number, { nombre: string, totalInvertido: number, cantidadChifones: number }> = {};

    ventasMes.forEach(v => {
      if (!v.cliente_id) return;
      if (!stats[v.cliente_id]) {
        stats[v.cliente_id] = { 
          nombre: v.cliente_nombre || 'Desconocido', 
          totalInvertido: 0, 
          cantidadChifones: 0 
        };
      }
      stats[v.cliente_id].totalInvertido += Number(v.total);
      // Estimación de chifones: En el sistema un chifón cuesta aprox 25 Bs. 
      // Para una precisión total se requeriría el detalle de venta, pero usamos el promedio de 25.
      stats[v.cliente_id].cantidadChifones += Math.round(Number(v.total) / 25);
    });

    return Object.values(stats).sort((a, b) => b.totalInvertido - a.totalInvertido);
  }, [ventasMes]);

  const changeMonth = (offset: number) => {
    let newMonth = selectedDate.month + offset;
    let newYear = selectedDate.year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setSelectedDate({ year: newYear, month: newMonth });
  };

  // Configuración de Gráficos
  const lineChartData = {
    labels: report?.details.dailySales.map(d => parseInt(String(d.fecha).split('T')[0].split('-')[2] || '0', 10)) || [],
    datasets: [{
      label: 'Ventas Diarias',
      data: report?.details.dailySales.map(d => d.total) || [],
      borderColor: 'rgb(249, 115, 22)',
      backgroundColor: 'rgba(249, 115, 22, 0.5)',
      tension: 0.3,
    }]
  };

  const doughnutData = {
    labels: report?.details.expensesByCategory.map(e => e.tipo) || [],
    datasets: [{
      data: report?.details.expensesByCategory.map(e => e.total) || [],
      backgroundColor: [
        'rgba(249, 115, 22, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)',
      ],
    }]
  };

  const barData = {
    labels: report?.details.productPerformance.map(p => p.nombre) || [],
    datasets: [{
      label: 'Recaudación por Producto',
      data: report?.details.productPerformance.map(p => p.totalRevenue) || [],
      backgroundColor: 'rgba(249, 115, 22, 0.8)',
      borderRadius: 8,
    }]
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Acceso No Autorizado</h3>
          <p className="text-slate-500 max-w-xs mx-auto">
            Tu cuenta no tiene los permisos necesarios para ver el reporte de utilidad mensual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Selectores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reporte de Utilidad</h2>
          <p className="text-slate-500">Análisis detallado de ingresos y egresos mensuales.</p>
        </div>
        
        <div className="flex items-center bg-white border border-slate-100 p-1 rounded-2xl shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 flex items-center gap-2 font-bold text-slate-700 min-w-40 justify-center">
            <Calendar size={18} className="text-orange-500" />
            {months[selectedDate.month - 1]} {selectedDate.year}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Ingresos Totales</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(report?.totalSales || 0)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">{report?.details.salesCount} ventas realizadas</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Egresos Totales</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(report?.totalExpenses || 0)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">{report?.details.expensesCount} registros de gasto</p>
        </div>

        <div className={cn(
          "p-6 rounded-3xl border shadow-sm",
          (report?.netUtility || 0) >= 0 
            ? "bg-emerald-50 border-emerald-100" 
            : "bg-rose-50 border-rose-100"
        )}>
          <div className="flex items-center gap-4 mb-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              (report?.netUtility || 0) >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            )}>
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Utilidad Neta</p>
              <p className={cn(
                "text-2xl font-black",
                (report?.netUtility || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
              )}>
                {formatCurrency(report?.netUtility || 0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium">Balance final del mes</p>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-500" />
            Tendencia de Ventas Diarias
          </h3>
          <div className="h-64">
            <Line data={lineChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChart size={18} className="text-orange-500" />
            Distribución de Gastos
          </h3>
          <div className="h-64 flex justify-center">
            <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-orange-500" />
            Recaudación por Producto
          </h3>
          <div className="h-80">
            <Bar data={barData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>
      </div>

      {/* Simulador de Rentabilidad para Clientes (Revendedores) */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calculator size={22} className="text-orange-500" />
              Simulador de Rentabilidad de Clientes
            </h3>
            <p className="text-sm text-slate-500">Calcula cuánto ganan tus clientes al vender por porciones.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="space-y-1 px-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Porciones x Chifón</label>
              <input 
                type="number" 
                className="w-16 bg-transparent border-none p-0 text-sm font-black text-slate-700 focus:ring-0"
                value={porciones}
                onChange={(e) => setPorciones(Number(e.target.value))}
              />
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="space-y-1 px-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Precio x Porción</label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-400">Bs.</span>
                <input 
                  type="number" 
                  className="w-16 bg-transparent border-none p-0 text-sm font-black text-slate-700 focus:ring-0"
                  value={precioPorcion}
                  onChange={(e) => setPrecioPorcion(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-center">Chifones (Est.)</th>
                <th className="px-4 py-3">Inversión (Pagó)</th>
                <th className="px-4 py-3">Venta Potencial</th>
                <th className="px-4 py-3">Ganancia Bruta</th>
                <th className="px-4 py-3 text-right">Rentabilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {performanceClientes.map((c, i) => {
                const ventaPotencial = c.cantidadChifones * porciones * precioPorcion;
                const ganancia = ventaPotencial - c.totalInvertido;
                const roi = c.totalInvertido > 0 ? (ganancia / c.totalInvertido) * 100 : 0;

                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-700">{c.nombre}</td>
                    <td className="px-4 py-4 text-center font-medium text-slate-600">{c.cantidadChifones}</td>
                    <td className="px-4 py-4 font-medium text-slate-600">{formatCurrency(c.totalInvertido)}</td>
                    <td className="px-4 py-4 font-bold text-blue-600">{formatCurrency(ventaPotencial)}</td>
                    <td className="px-4 py-4 font-bold text-emerald-600">{formatCurrency(ganancia)}</td>
                    <td className="px-4 py-4 text-right">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-black rounded-lg">
                        +{roi.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-xs text-blue-700 leading-relaxed">
            Los datos de cantidad de chifones son una **estimación** basada en el total de la venta dividido por el costo promedio (25 Bs). 
          </p>
        </div>
      </div>
    </div>
  );
}