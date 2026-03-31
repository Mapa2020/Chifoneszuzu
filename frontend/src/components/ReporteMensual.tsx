import { useState, useEffect } from 'react';
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
  ShieldAlert
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
import { useAuth } from '../AuthContext';
import { MonthlyReportData } from '../types';
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
        const res = await fetch(`/api/reportes/monthly/${selectedDate.year}/${selectedDate.month}`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`
          }
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}: Acceso denegado`);
        }

        setReport(data);
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
    labels: report?.details.dailySales.map(d => new Date(d.fecha).getDate()) || [],
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
    </div>
  );
}