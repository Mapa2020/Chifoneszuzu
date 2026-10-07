import React, { useState, useEffect } from 'react';
import { 
  Box, 
  RotateCcw, 
  Search, 
  Award, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Plus,
  FileText,
  Filter,
  ArrowRight,
  TrendingUp,
  Share2,
  Trash2,
  Phone,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useAuth } from '../authcontext';
import DevolucionModal from './DevolucionModal';
import CartillaVisual from './CartillaVisual';

export default function Contenedores() {
  const { user } = useAuth();
  const isAdmin = user?.rol?.toLowerCase() === 'admin' || user?.rol?.toLowerCase() === 'administrador';

  const [activeTab, setActiveTab] = useState<'control' | 'cartilla' | 'movimientos'>('control');
  const [data, setData] = useState<any>({ estadisticas: {}, clientes: [] });
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZona, setFilterZona] = useState<string>('TODAS');
  
  // Cliente actualmente seleccionado para ver su Cartilla Visual
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);

  // Modal de devolución diaria
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [devolucionClienteId, setDevolucionClienteId] = useState<number | null>(null);

  const fetchData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${user.token}` };
      const [resumenRes, movRes] = await Promise.all([
        fetch('/api/contenedores/resumen', { headers }).then(r => r.json()),
        fetch('/api/contenedores/movimientos?limit=30', { headers }).then(r => r.json())
      ]);

      setData(resumenRes);
      if (Array.isArray(movRes)) setMovimientos(movRes);

      // Si no hay cliente seleccionado, elegir el primero de la lista
      if (!selectedClienteId && resumenRes.clientes && resumenRes.clientes.length > 0) {
        setSelectedClienteId(resumenRes.clientes[0].cliente_id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al cargar datos de contenedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Sincronizar ventas existentes con las cartillas
  const handleSincronizarVentas = async () => {
    if (!user?.token) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/contenedores/sincronizar-ventas', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Ventas sincronizadas", {
          description: `Se sincronizaron ${json.countSincronizados || 0} chifones a las cartillas.`
        });
        fetchData();
      }
    } catch (err) {
      toast.error("Error al sincronizar ventas");
    } finally {
      setSyncing(false);
    }
  };

  // Eliminar un movimiento erróneo
  const handleDeleteMovimiento = async (id: number) => {
    if (!confirm("¿Deseas eliminar este registro de movimiento?")) return;
    try {
      const res = await fetch(`/api/contenedores/movimientos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        toast.success("Registro eliminado");
        fetchData();
      }
    } catch (err) {
      toast.error("No se pudo eliminar el registro");
    }
  };

  // Abrir modal de devolución para un cliente específico
  const openDevolucionPara = (clId: number) => {
    setDevolucionClienteId(clId);
    setShowDevolucionModal(true);
  };

  // Abrir cartilla visual para un cliente
  const openCartillaPara = (clId: number) => {
    setSelectedClienteId(clId);
    setActiveTab('cartilla');
  };

  const clientesList = data.clientes || [];
  
  // Zonas únicas para el filtro
  const zonas = ['TODAS', ...Array.from(new Set(clientesList.map((c: any) => c.zona || 'OTROS')))];

  // Clientes filtrados por búsqueda y zona
  const filteredClientes = clientesList.filter((c: any) => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.telefono && c.telefono.includes(searchTerm));
    const matchesZona = filterZona === 'TODAS' || (c.zona || 'OTROS') === filterZona;
    return matchesSearch && matchesZona;
  });

  const stats = data.estadisticas || {
    enCirculacion: 0,
    devueltosHoy: 0,
    dadosDeBaja: 0,
    totalClientesSnack: 0
  };

  return (
    <div className="space-y-6">

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Control de Envases y Cartillas</h2>
          <p className="text-slate-500 text-sm">
            {isAdmin 
              ? 'Gestión global de retorno diario de contenedores reutilizables y cartillas de fidelización visuales.' 
              : 'Gestión de tus contenedores prestados y clientes atendidos en ruta.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              onClick={handleSincronizarVentas}
              disabled={syncing}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
              title="Sincronizar ventas recientes a las cartillas"
            >
              <RefreshCw size={16} className={cn("text-slate-500", syncing && "animate-spin text-orange-500")} />
              {syncing ? "Sincronizando..." : "Sincronizar Ventas"}
            </button>
          )}

          <button
            onClick={() => {
              setDevolucionClienteId(null);
              setShowDevolucionModal(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 transition-all cursor-pointer"
          >
            <RotateCcw size={18} />
            Registrar Devolución Diaria
          </button>
        </div>
      </div>

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">En Circulación</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.enCirculacion}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">En poder de clientes Snack</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Box size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Devueltos Hoy</p>
            <h3 className="text-2xl font-black text-emerald-600">{stats.devueltosHoy}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Retornados en la ruta de hoy</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <RotateCcw size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dados de Baja</p>
            <h3 className="text-2xl font-black text-rose-600">{stats.dadosDeBaja}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Por 5 usos o daño físico</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clientes Snack</p>
            <h3 className="text-2xl font-black text-orange-600">{stats.totalClientesSnack}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Con cartillas de fidelización</p>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('control')}
          className={cn(
            "flex items-center gap-2 py-3 px-5 font-bold text-sm border-b-2 transition-all cursor-pointer",
            activeTab === 'control'
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Box size={18} />
          Clientes Snack y Envases
        </button>

        <button
          onClick={() => setActiveTab('cartilla')}
          className={cn(
            "flex items-center gap-2 py-3 px-5 font-bold text-sm border-b-2 transition-all cursor-pointer",
            activeTab === 'cartilla'
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Award size={18} />
          Cartilla Visual de Fidelidad
        </button>

        <button
          onClick={() => setActiveTab('movimientos')}
          className={cn(
            "flex items-center gap-2 py-3 px-5 font-bold text-sm border-b-2 transition-all cursor-pointer",
            activeTab === 'movimientos'
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <FileText size={18} />
          Historial de Retornos
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: LISTADO DE CLIENTES SNACK Y CONTROL DE ENVASES */}
      {/* ========================================================================= */}
      {activeTab === 'control' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          
          {/* Barra de Filtros */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar cliente Snack..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterZona}
                onChange={(e) => setFilterZona(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                {zonas.map((z: any) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Clientes Snack */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Cliente Snack</th>
                  <th className="py-4 px-4">Zona / Teléfono</th>
                  <th className="py-4 px-4 text-center">Tipo Cartilla</th>
                  <th className="py-4 px-4 text-center">Progreso Cartilla</th>
                  <th className="py-4 px-4 text-center">Envases Pendientes</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
                      Cargando clientes de categoría Snack...
                    </td>
                  </tr>
                ) : filteredClientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      No se encontraron clientes Snack con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredClientes.map((cl: any) => {
                    const isPref = cl.tipo_cartilla === 'Preferente';
                    const pendientes = Number(cl.pendientes_actual || 0);
                    const chifones = Number(cl.chifones_acumulados || 0);
                    const devueltos = Number(cl.envases_devueltos || 0);

                    return (
                      <tr key={cl.cliente_id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* Nombre del Cliente */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                              {cl.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{cl.nombre}</p>
                              <p className="text-xs text-slate-400">ID #{cl.cliente_id} • Cartilla #{cl.numero_cartilla || '01/26'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Zona y Teléfono */}
                        <td className="py-4 px-4 text-xs text-slate-600">
                          <p className="flex items-center gap-1 font-semibold">
                            <MapPin size={12} className="text-slate-400" />
                            {cl.zona || 'UAGRM'}
                          </p>
                          {cl.telefono && (
                            <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone size={12} /> {cl.telefono}
                            </p>
                          )}
                        </td>

                        {/* Tipo de Cartilla */}
                        <td className="py-4 px-4 text-center">
                          <span className={cn(
                            "inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                            isPref ? "bg-pink-100 text-pink-700 border border-pink-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                          )}>
                            {cl.tipo_cartilla || 'Activo'}
                          </span>
                        </td>

                        {/* Progreso de la Cartilla (Chifones y Envases) */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-slate-700">{chifones} / 10 chifones</span>
                              <span className="text-[10px] text-slate-400">({devueltos} envases)</span>
                            </div>
                            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", isPref ? "bg-pink-500" : "bg-orange-500")}
                                style={{ width: `${Math.min((chifones / 10) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Envases Pendientes de Devolución */}
                        <td className="py-4 px-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black",
                            pendientes > 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          )}>
                            <Box size={14} />
                            {pendientes > 0 ? `${pendientes} pendientes` : "Al día"}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openDevolucionPara(cl.cliente_id)}
                              className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold text-xs transition-colors cursor-pointer"
                              title="Registrar devolución de envases"
                            >
                              Devolver
                            </button>
                            <button
                              onClick={() => openCartillaPara(cl.cliente_id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                              title="Ver cartilla visual"
                            >
                              <Award size={14} />
                              Ver Cartilla
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: VISUALIZADOR DE CARTILLA DIGITAL (ACTIVO / PREFERENTE) */}
      {/* ========================================================================= */}
      {activeTab === 'cartilla' && (
        <div className="space-y-6">
          
          {/* Selector de Cliente para la Cartilla */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Cliente Consultado:
              </span>
              <select
                value={selectedClienteId || ''}
                onChange={(e) => setSelectedClienteId(Number(e.target.value))}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 cursor-pointer min-w-64"
              >
                {clientesList.map((c: any) => (
                  <option key={c.cliente_id} value={c.cliente_id}>
                    {c.nombre} (Cartilla {c.tipo_cartilla || 'Activo'} #{c.numero_cartilla || '01/26'})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setActiveTab('control')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              Volver al listado general
            </button>
          </div>

          {/* Componente Visual de la Cartilla */}
          {selectedClienteId && (
            <CartillaVisual 
              clienteId={selectedClienteId} 
              onRefreshParent={fetchData} 
            />
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: HISTORIAL DE RETORNOS Y MOVIMIENTOS */}
      {/* ========================================================================= */}
      {activeTab === 'movimientos' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">Movimientos de Envases</h3>
              <p className="text-xs text-slate-400">Auditoría de entregas, devoluciones y bajas físicas</p>
            </div>
            <button
              onClick={() => setShowDevolucionModal(true)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              + Nueva Devolución
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">Fecha</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Tipo</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4">Condición / Estado</th>
                  <th className="py-3 px-4">Observaciones</th>
                  <th className="py-3 px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                      No hay movimientos registrados recientemente.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((m: any) => (
                    <tr key={m.registro_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-slate-700">
                        {formatDate(m.fecha)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {m.cliente_nombre}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase",
                          m.tipo === 'Devolucion' ? "bg-emerald-100 text-emerald-700" :
                          m.tipo === 'Entrega' ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-slate-800">
                        {m.cantidad} envase(s)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "font-bold",
                          m.condicion === 'Sano' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {m.condicion || 'Sano'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic">
                        {m.observaciones || '-'}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteMovimiento(m.registro_id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Devolución Diaria */}
      <DevolucionModal
        isOpen={showDevolucionModal}
        onClose={() => setShowDevolucionModal(false)}
        onSuccess={fetchData}
        preselectedClienteId={devolucionClienteId}
        clientes={clientesList}
      />

    </div>
  );
}
