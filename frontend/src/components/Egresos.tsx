import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  X, 
  Trash2, 
  Pencil, 
  UtensilsCrossed, 
  Users, 
  Home, 
  Layers,
  Fuel,
  TrendingDown,
  Package
} from 'lucide-react';
import { useAuth } from '../authcontext';
import { toast } from 'sonner';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { Egreso, Ingrediente } from '../types';
import { formatCurrency, cn, getLocalDateString, getStartOfMonthString, getEndOfMonthString, formatDate } from '../lib/utils';

const columnHelper = createColumnHelper<Egreso>();

type AmbitoType = 'Todos' | 'Proceso' | 'Personal' | 'Casa';

export default function Egresos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Egreso[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<AmbitoType>('Todos');

  // Filtros de fecha inicializados al mes actual
  const [startDate, setStartDate] = useState(getStartOfMonthString());
  const [endDate, setEndDate] = useState(getEndOfMonthString());

  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Categorías predefinidas según el Excel
  const categoriasPorAmbito: Record<'Proceso' | 'Personal' | 'Casa', string[]> = {
    Proceso: ['Ingredientes', 'Transporte', 'Limpieza', 'Gas', 'Equipamiento', 'Pasajes', 'Otros'],
    Personal: ['Sueldo', 'Jornal', 'Adelanto', 'Bono'],
    Casa: ['Almuerzo', 'Desayuno', 'Louch', 'Carnes', 'Verduras', 'Lacteos', 'Frutas', 'Combustible', 'Pasajes', 'Otros']
  };

  const [formData, setFormData] = useState({
    fecha: getLocalDateString(),
    ambito: 'Proceso' as 'Proceso' | 'Personal' | 'Casa',
    categoria: 'Ingredientes',
    cantidad: '1',
    precio_unitario: '',
    monto: '',
    concepto: '',
    proveedor_id: '',
    ingrediente_id: ''
  });

  const fetchEgresos = useCallback(() => {
    if (!user?.token) return;
    setLoading(true);
    fetch('/api/egresos', {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
    .then(res => res.json())
    .then(data => {
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    })
    .catch(() => {
      toast.error("Error al cargar egresos");
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    fetchEgresos();
    if (user?.token) {
      fetch('/api/proveedores', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      .then(res => res.json())
      .then(data => setProveedores(Array.isArray(data) ? data : []));

      fetch('/api/ingredientes', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      .then(res => res.json())
      .then(data => setIngredientes(Array.isArray(data) ? data : []));
    }
  }, [fetchEgresos, user]);

  const handleOpenModal = (egreso?: Egreso, defaultAmbito?: 'Proceso' | 'Personal' | 'Casa') => {
    if (egreso) {
      const amb = (egreso.ambito || 'Proceso') as 'Proceso' | 'Personal' | 'Casa';
      setEditingId(egreso.egreso_id);
      setFormData({
        fecha: egreso.fecha ? egreso.fecha.split('T')[0] : getLocalDateString(),
        ambito: amb,
        categoria: egreso.categoria || egreso.tipo || 'Otros',
        cantidad: (egreso.cantidad || 1).toString(),
        precio_unitario: egreso.precio_unitario !== undefined && egreso.precio_unitario !== null ? egreso.precio_unitario.toString() : '',
        monto: egreso.monto.toString(),
        concepto: egreso.concepto,
        proveedor_id: egreso.proveedor_id?.toString() || '',
        ingrediente_id: egreso.ingrediente_id?.toString() || ''
      });
    } else {
      const amb = defaultAmbito || (activeTab === 'Todos' ? 'Proceso' : activeTab);
      setEditingId(null);
      setFormData({
        fecha: getLocalDateString(),
        ambito: amb,
        categoria: categoriasPorAmbito[amb][0] || 'Otros',
        cantidad: '1',
        precio_unitario: '',
        monto: '',
        concepto: '',
        proveedor_id: '',
        ingrediente_id: ''
      });
    }
    setShowModal(true);
  };

  // Cálculo automático del monto cuando cambia cantidad o unitario
  const handleCantidadChange = (val: string) => {
    const q = parseFloat(val);
    const u = parseFloat(formData.precio_unitario);
    const newMonto = (!isNaN(q) && !isNaN(u)) ? (q * u).toFixed(2) : formData.monto;
    setFormData(prev => ({ ...prev, cantidad: val, monto: newMonto }));
  };

  const handlePrecioUnitarioChange = (val: string) => {
    const u = parseFloat(val);
    const q = parseFloat(formData.cantidad);
    const newMonto = (!isNaN(q) && !isNaN(u)) ? (q * u).toFixed(2) : formData.monto;
    setFormData(prev => ({ ...prev, precio_unitario: val, monto: newMonto }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/egresos/${editingId}` : '/api/egresos';

    const cant = parseFloat(formData.cantidad) || 1;
    const unit = formData.precio_unitario ? parseFloat(formData.precio_unitario) : null;
    const finalMonto = formData.monto ? parseFloat(formData.monto) : (unit !== null ? cant * unit : 0);

    if (isNaN(finalMonto) || finalMonto <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          fecha: formData.fecha,
          ambito: formData.ambito,
          categoria: formData.categoria,
          cantidad: cant,
          precio_unitario: unit,
          monto: finalMonto,
          concepto: formData.concepto,
          proveedor_id: formData.proveedor_id || null,
          tipo: formData.categoria,
          ingrediente_id: formData.ingrediente_id ? Number(formData.ingrediente_id) : null
        })
      });

      if (res.ok) {
        toast.success(editingId ? "Egreso actualizado" : "Egreso registrado con éxito");
        setShowModal(false);
        setEditingId(null);
        fetchEgresos();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al procesar la solicitud");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este registro de gasto?')) return;
    const res = await fetch(`/api/egresos/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${user?.token}` }
    });
    if (res.ok) {
      toast.success("Egreso eliminado");
      fetchEgresos();
    }
  };

  // Filtrado por pestaña, búsqueda y fechas
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = item.concepto.toLowerCase().includes(searchLower) || 
                            (item.categoria && item.categoria.toLowerCase().includes(searchLower)) ||
                            (item.tipo && item.tipo.toLowerCase().includes(searchLower));

      const itemAmbito = item.ambito || 'Proceso';
      const matchesTab = activeTab === 'Todos' || itemAmbito === activeTab;
      
      const itemDate = item.fecha ? item.fecha.split('T')[0] : '';
      const matchesDate = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);

      return matchesSearch && matchesTab && matchesDate;
    });
  }, [items, searchTerm, activeTab, startDate, endDate]);

  // Totales acumulados para el rango de fechas seleccionado
  const subtotales = useMemo(() => {
    let totProceso = 0;
    let totPersonal = 0;
    let totCasa = 0;

    items.forEach(it => {
      const itDate = it.fecha ? it.fecha.split('T')[0] : '';
      const inRange = (!startDate || itDate >= startDate) && (!endDate || itDate <= endDate);
      if (!inRange) return;

      const m = Number(it.monto || 0);
      const amb = it.ambito || 'Proceso';
      if (amb === 'Proceso') totProceso += m;
      else if (amb === 'Personal') totPersonal += m;
      else if (amb === 'Casa') totCasa += m;
    });

    return {
      proceso: totProceso,
      personal: totPersonal,
      casa: totCasa,
      operativo: totProceso + totPersonal, // Proceso + Personal (Fondo 70%)
      total: totProceso + totPersonal + totCasa
    };
  }, [items, startDate, endDate]);

  const columns = [
    columnHelper.accessor('fecha', {
      header: 'Fecha',
      cell: info => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="font-medium text-slate-700">{formatDate(info.getValue()) || '-'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('ambito', {
      header: 'Ámbito',
      cell: info => {
        const value = info.getValue() || 'Proceso';
        return (
          <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
            value === 'Proceso' ? "bg-orange-50 text-orange-600" :
            value === 'Personal' ? "bg-purple-50 text-purple-600" :
            "bg-blue-50 text-blue-600"
          )}>
            {value === 'Proceso' && <UtensilsCrossed size={12} />}
            {value === 'Personal' && <Users size={12} />}
            {value === 'Casa' && <Home size={12} />}
            {value === 'Proceso' ? 'Proceso (70%)' : value === 'Personal' ? 'Personal (70%)' : 'Casa (30%)'}
          </span>
        );
      },
    }),
    columnHelper.accessor('categoria', {
      header: 'Categoría',
      cell: info => {
        const val = info.getValue() || info.row.original.tipo || 'Otros';
        return (
          <span className="font-semibold text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor('concepto', {
      header: 'Descripción',
      cell: info => (
        <div>
          <p className="text-slate-800 font-medium text-sm">{info.getValue()}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {info.row.original.proveedor_nombre && (
              <span className="text-[11px] text-slate-400">Prov: {info.row.original.proveedor_nombre}</span>
            )}
            {info.row.original.ingrediente_nombre && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-100">
                <Package size={11} className="text-emerald-600" />
                Insumo: {info.row.original.ingrediente_nombre} (+{info.row.original.cantidad} {info.row.original.ingrediente_unidad || ''})
              </span>
            )}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('cantidad', {
      header: 'Cant. / Unit.',
      cell: info => {
        const cant = info.getValue();
        const unit = info.row.original.precio_unitario;
        if (!unit) return <span className="text-slate-400 text-xs">-</span>;
        return (
          <span className="text-xs text-slate-500 font-medium">
            {cant} x {formatCurrency(unit)}
          </span>
        );
      },
    }),
    columnHelper.accessor('monto', {
      header: 'Monto Total',
      cell: info => <span className="font-black text-rose-600 text-sm">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: info => (
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleOpenModal(info.row.original)} 
            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
            title="Editar egreso"
          >
            <Pencil size={15} />
          </button>
          <button 
            onClick={() => handleDelete(info.row.original.egreso_id)} 
            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors"
            title="Eliminar egreso"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Control de Egresos y Gastos</h2>
          <p className="text-slate-500 text-sm">Separación del proceso productivo, pago a personal y gastos de casa (Modelo 70/30).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-orange-200"
        >
          <Plus size={20} />
          Registrar Gasto
        </button>
      </div>

      {/* KPI Cards del período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gastos Proceso */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gastos del Proceso</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><UtensilsCrossed size={18} /></div>
          </div>
          <p className="text-2xl font-black text-slate-800">{formatCurrency(subtotales.proceso)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Insumos, Gas, Gasolina, Envases</p>
        </div>

        {/* Pago Personal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pago a Personal</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Users size={18} /></div>
          </div>
          <p className="text-2xl font-black text-purple-700">{formatCurrency(subtotales.personal)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Sueldos, jornales y adelantos</p>
        </div>

        {/* Gastos de Casa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gastos de Casa</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Home size={18} /></div>
          </div>
          <p className="text-2xl font-black text-blue-700">{formatCurrency(subtotales.casa)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Almuerzos, despensa, uso personal</p>
        </div>

        {/* Total General */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Egresos</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><TrendingDown size={18} /></div>
          </div>
          <p className="text-2xl font-black text-rose-600">{formatCurrency(subtotales.total)}</p>
          <p className="text-[11px] text-slate-400 mt-1">70% Operativo: {formatCurrency(subtotales.operativo)}</p>
        </div>
      </div>

      {/* Selector de Pestañas (Tal como en el Excel) */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('Todos')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
            activeTab === 'Todos' ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100"
          )}
        >
          <Layers size={14} /> Todos ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('Proceso')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
            activeTab === 'Proceso' ? "bg-orange-500 text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100"
          )}
        >
          <UtensilsCrossed size={14} /> Gastos del Proceso (Diarios)
        </button>

        <button
          onClick={() => setActiveTab('Personal')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
            activeTab === 'Personal' ? "bg-purple-600 text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100"
          )}
        >
          <Users size={14} /> Pago Personal
        </button>

        <button
          onClick={() => setActiveTab('Casa')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap",
            activeTab === 'Casa' ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100"
          )}
        >
          <Home size={14} /> Gastos de Casa (Bills Home)
        </button>
      </div>

      {/* Filtros y Tabla */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por concepto o categoría..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 w-full md:w-auto">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold focus:ring-0 text-slate-600 outline-none cursor-pointer"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-slate-300 font-bold px-1 text-[10px]">A</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold focus:ring-0 text-slate-600 outline-none cursor-pointer"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-slate-50/70 border-b border-slate-100">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-5 py-3.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No se encontraron egresos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-5 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro / Edición */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800">{editingId ? 'Editar Egreso' : 'Nuevo Registro de Gasto'}</h3>
                <p className="text-xs text-slate-400">Clasifica el gasto según el proceso, personal o casa.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Selector de Ámbito */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">¿A qué fondo pertenece?</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        ambito: 'Proceso', 
                        categoria: categoriasPorAmbito.Proceso[0] 
                      }));
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1",
                      formData.ambito === 'Proceso' ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <UtensilsCrossed size={16} /> Proceso (70%)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        ambito: 'Personal', 
                        categoria: categoriasPorAmbito.Personal[0] 
                      }));
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1",
                      formData.ambito === 'Personal' ? "border-purple-500 bg-purple-50 text-purple-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Users size={16} /> Personal (70%)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        ambito: 'Casa', 
                        categoria: categoriasPorAmbito.Casa[0] 
                      }));
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1",
                      formData.ambito === 'Casa' ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Home size={16} /> Casa (30%)
                  </button>
                </div>
              </div>

              {/* Fecha y Categoría */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Fecha</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500" 
                    value={formData.fecha} 
                    onChange={e => setFormData({...formData, fecha: e.target.value})} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Categoría</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500" 
                    value={formData.categoria} 
                    onChange={e => setFormData({...formData, categoria: e.target.value})}
                  >
                    {categoriasPorAmbito[formData.ambito].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de Insumo si pertenece al Proceso */}
              {formData.ambito === 'Proceso' && (
                <div className="p-3.5 bg-orange-50/70 border border-orange-200/80 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Package size={14} className="text-orange-600" />
                      ¿Vincular con inventario de Insumos?
                    </label>
                    {formData.ingrediente_id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        Afectará Stock
                      </span>
                    )}
                  </div>

                  <select
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                    value={formData.ingrediente_id}
                    onChange={e => {
                      const id = e.target.value;
                      const selected = ingredientes.find(i => i.ingrediente_id.toString() === id);
                      setFormData(prev => ({
                        ...prev,
                        ingrediente_id: id,
                        categoria: id ? 'Ingredientes' : prev.categoria,
                        concepto: (!prev.concepto || prev.concepto.startsWith('Compra de ')) && selected
                          ? `Compra de ${selected.nombre}`
                          : prev.concepto
                      }));
                    }}
                  >
                    <option value="">-- No vincular (solo registrar gasto monetario) --</option>
                    {ingredientes.map(i => (
                      <option key={i.ingrediente_id} value={i.ingrediente_id}>
                        📦 {i.nombre} ({i.unidad_medida}) — Stock actual: {i.stock_actual}
                      </option>
                    ))}
                  </select>

                  {formData.ingrediente_id && (() => {
                    const sel = ingredientes.find(i => i.ingrediente_id.toString() === formData.ingrediente_id);
                    if (!sel) return null;
                    const cantNum = parseFloat(formData.cantidad) || 0;
                    const stockFuturo = (Number(sel.stock_actual) + cantNum).toFixed(2);
                    return (
                      <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-orange-100 flex items-center justify-between">
                        <span>Stock actual: <strong>{sel.stock_actual} {sel.unidad_medida}</strong></span>
                        <span className="text-emerald-700 font-bold">
                          Stock resultante: {stockFuturo} {sel.unidad_medida} (+{cantNum})
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Concepto / Descripción */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Concepto / Descripción del Gasto</label>
                <input 
                  required 
                  placeholder="Ej: Compra de 5 maples de huevo, Gasolina para entregas, Sueldo semana..." 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500" 
                  value={formData.concepto} 
                  onChange={e => setFormData({...formData, concepto: e.target.value})} 
                />
              </div>

              {/* Cantidad, Unitario y Monto Total */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">Cantidad</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="1" 
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none" 
                    value={formData.cantidad} 
                    onChange={e => handleCantidadChange(e.target.value)} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">P. Unitario</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none" 
                    value={formData.precio_unitario} 
                    onChange={e => handlePrecioUnitarioChange(e.target.value)} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800">Total (Bs.)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="0.00" 
                    className="w-full p-2 bg-white border border-orange-200 text-orange-600 rounded-lg text-xs font-black outline-none" 
                    value={formData.monto} 
                    onChange={e => setFormData({...formData, monto: e.target.value})} 
                  />
                </div>
              </div>

              {/* Proveedor (Opcional) */}
              {formData.ambito === 'Proceso' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Proveedor (Opcional)</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-500" 
                    value={formData.proveedor_id} 
                    onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                  >
                    <option value="">Ninguno / Compra Directa</option>
                    {proveedores.map(p => (
                      <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Botones */}
              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 px-4 py-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-200 transition-all"
                >
                  {editingId ? 'Guardar Cambios' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
