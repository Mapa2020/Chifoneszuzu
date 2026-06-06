import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Box, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Check,
  MessageCircle,
  Database,
  ShieldCheck,
  Search,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { DashboardStats, MonthlyReportData, Venta, Cliente } from '../types';
import { useAuth } from '../authcontext';
import { toast } from 'sonner';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color: string;
}

function StatCard({ title, value, icon: Icon, trend, trendValue, color }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.rol?.toLowerCase() === 'admin' || 
                  user?.rol?.toLowerCase() === 'administrador';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [productos, setProductos] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [searchCliente, setSearchCliente] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.token) return;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const headers = { 'Authorization': `Bearer ${user.token}` };

      try {
        const [statsRes, prodRes, salesRes, clientesRes] = await Promise.all([
          fetch('/api/dashboard/stats', { headers }).then(res => res.json()),
          fetch('/api/productos', { headers }).then(res => res.json()),
          fetch('/api/ventas', { headers }).then(res => res.json()),
          fetch('/api/clientes', { headers }).then(res => res.json())
        ]);

        setStats(statsRes);
        setProductos(prodRes);
        setRecentSales(salesRes.slice(0, 10)); // Solo las últimas 10
        setClientes(clientesRes);

        // Solo intentamos cargar el reporte si el usuario es Admin para evitar el error 403
        if (isAdmin) {
          const monthRes = await fetch(`/api/reportes/monthly/${year}/${month}`, { headers }).then(res => res.json());
          if (monthRes && !monthRes.error) {
            setMonthlyData(monthRes);
          }
        }
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const userClienteId = (user as any)?.cliente_id;

  const clienteConsultado = useMemo(() => {
    // Si es un cliente logueado, mostrar su propia tarjeta automáticamente
    if (!isAdmin && userClienteId) {
      return clientes.find(c => c.cliente_id === userClienteId);
    }
    if (!searchCliente) return null;
    return clientes.find(c => c.nombre.toLowerCase().includes(searchCliente.toLowerCase()) || c.cliente_id.toString() === searchCliente);
  }, [clientes, searchCliente, userClienteId, isAdmin]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Respaldo del Sistema", { description: data.message });
      } else {
        toast.error(data.error || "No se pudo realizar el respaldo.");
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor");
    } finally {
      setBackingUp(false);
    }
  };

  // Consolidar datos para el gráfico comparativo
  const chartData = useMemo(() => {
    if (!monthlyData?.details?.dailySales) return [];
    
    // Crear un mapa de egresos por fecha para fácil acceso
    const expensesMap = (monthlyData.details.expensesByCategory || []).reduce((acc: any, curr: any) => {
       // Nota: Tu API actual no devuelve egresos diarios detallados en stats, 
       // pero podemos simular la estructura si la expandes luego. 
       // Por ahora usaremos los datos de ventas disponibles.
       return acc;
    }, {});

    return monthlyData.details.dailySales.map(day => ({
      name: new Date(day.fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }),
      ventas: day.total,
      egresos: 0 // Aquí conectarías egresos diarios si los tuvieras
    }));
  }, [monthlyData]);

  const sendWhatsAppReport = () => {
    if (!stats?.lowStockItems || stats.lowStockItems.length === 0) return;

    let message = "*🚨 REPORTE DE STOCK CRÍTICO - CHIFONES ZUZÚ* %0A";
    message += "------------------------------------%0A";
    stats.lowStockItems.forEach(item => {
      message += `• *${item.nombre}*: Quedan ${Number(item.stock_actual).toFixed(3)} ${item.unidad_medida}%0A`;
    });
    message += "------------------------------------%0A";
    message += "_Generado automáticamente desde el Panel de Control._";

    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>
        <p className="text-slate-500">Bienvenido de nuevo, aquí tienes el resumen de hoy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={isAdmin ? "Ventas del Día" : "Mis Ventas de Hoy"}
          value={formatCurrency(stats?.salesToday || 0)} 
          icon={TrendingUp} 
          trend="up" 
          trendValue="12%" 
          color="bg-orange-500"
        />
        {isAdmin && (
          <>
            <StatCard 
              title="Gastos del Día" 
              value={formatCurrency(stats?.expensesToday || 0)} 
              icon={TrendingDown} 
              trend="down" 
              trendValue="5%" 
              color="bg-slate-800"
            />
            <StatCard 
              title="Insumos Críticos" 
              value={stats?.lowStockCount || 0} 
              icon={AlertCircle} 
              color="bg-red-500"
            />
            <StatCard 
              title="Envases Pendientes" 
              value={stats?.pendingContainers || 0} 
              icon={Box} 
              color="bg-blue-500"
            />
          </>
        )}
      </div>

      {/* Sección Operativa para el Vendedor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Buscador de Tarjeta de Fidelidad */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <UserCheck size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Consulta de Tarjeta Zuzú</h3>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente por nombre o ID..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all"
              value={searchCliente}
              onChange={(e) => setSearchCliente(e.target.value)}
            />
          </div>

          {clienteConsultado ? (
            <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-bold text-orange-900">{clienteConsultado.nombre}</p>
                  <p className="text-xs text-orange-600">ID: {clienteConsultado.cliente_id}</p>
                </div>
                <span className="px-3 py-1 bg-white text-orange-600 text-xs font-black rounded-full shadow-sm border border-orange-100">
                  {clienteConsultado.categoria}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-orange-800 font-medium">Progreso para Chifón Gratis:</span>
                  <span className="font-black text-orange-600">{clienteConsultado.tarjeta_snack} / 10</span>
                </div>
                <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-orange-100">
                  <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${(clienteConsultado.tarjeta_snack / 10) * 100}%` }}></div>
                </div>
                {clienteConsultado.tarjeta_snack >= 10 && (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-2">
                    <Check size={14} /> ¡Listo para canjear su chifón gratis!
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-400">Ingresa un nombre para verificar puntos</p>
            </div>
          )}
        </div>

        {/* Últimas 10 Ventas */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Mis Últimos Pedidos</h3>
          <div className="space-y-3">
            {recentSales.map((venta) => (
              <div key={venta.venta_id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold">
                    #{venta.venta_id}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{venta.cliente_nombre || 'Venta Directa'}</p>
                    <p className="text-[10px] text-slate-400">{new Date(venta.fecha).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{formatCurrency(venta.total)}</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      venta.forma_pago === 'CreditoDia' ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                    )}></span>
                    <p className={cn(
                      "text-[10px] font-bold uppercase",
                      venta.forma_pago === 'CreditoDia' ? "text-amber-600" : "text-emerald-600"
                    )}>
                      {venta.forma_pago}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-w-0">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Rendimiento Semanal</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="ventas" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Alertas de Stock</h3>
                {stats?.lowStockItems && stats.lowStockItems.length > 0 && (
                  <button onClick={sendWhatsAppReport} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Enviar reporte por WhatsApp">
                    <MessageCircle size={20} />
                  </button>
                )}
              </div>
              <div className="space-y-4 flex-1">
                {stats?.lowStockItems && stats.lowStockItems.length > 0 ? (
                  stats.lowStockItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-100">
                      <div>
                        <p className="font-bold text-rose-900 text-sm">{item.nombre}</p>
                        <p className="text-xs text-rose-600">Quedan {Number(item.stock_actual).toFixed(3)} {item.unidad_medida}</p>
                      </div>
                      <div className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center">
                        <AlertCircle size={18} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Check size={32} className="text-emerald-500 mb-2" />
                    <p className="text-sm font-medium text-slate-600">¡Todo en orden!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-w-0">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Comparativa Ventas vs Gastos</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="ventas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="egresos" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-3 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-w-0">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Rentabilidad por Sabor</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productos}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value) => formatCurrency(value as number)} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: '600' }} />
                    <Bar dataKey="costo_produccion" name="Costo" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar dataKey="precio" name="Precio" fill="#f97316" radius={[4, 4, 0, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShieldCheck size={20} /></div>
                <h3 className="text-lg font-bold text-slate-800">Administración Global</h3>
              </div>
              <p className="text-sm text-slate-500 mb-6">Ejecuta tareas de mantenimiento del sistema.</p>
              <button 
                onClick={handleBackup}
                disabled={backingUp}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold transition-all",
                  backingUp ? "bg-slate-100 text-slate-400" : "bg-slate-800 text-white hover:bg-slate-900 shadow-lg shadow-slate-200"
                )}
              >
                {backingUp ? <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full" /> : <Database size={18} />}
                {backingUp ? "Generando Respaldo..." : "Crear Backup"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
