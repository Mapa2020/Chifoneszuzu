import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Calendar,
  MoreVertical,
  X,
  Trash2,
  Pencil
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { Egreso } from '../types';
import { formatCurrency, cn } from '../lib/utils';

const columnHelper = createColumnHelper<Egreso>();

export default function Egresos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Egreso[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos los tipos');

  // Filtros de fecha inicializados al mes actual
  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Otros',
    concepto: '',
    monto: '',
    proveedor_id: ''
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
    }
  }, [fetchEgresos, user]);

  const handleOpenModal = (egreso?: Egreso) => {
    if (egreso) {
      setEditingId(egreso.egreso_id);
      setFormData({
        fecha: egreso.fecha.split('T')[0], // Asegura formato YYYY-MM-DD para el input
        tipo: egreso.tipo,
        concepto: egreso.concepto,
        monto: egreso.monto.toString(),
        proveedor_id: egreso.proveedor_id?.toString() || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'Otros',
        concepto: '',
        monto: '',
        proveedor_id: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/egresos/${editingId}` : '/api/egresos';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ...formData,
          monto: parseFloat(formData.monto),
          proveedor_id: formData.proveedor_id || null
        })
      });

      if (res.ok) {
        toast.success(editingId ? "Egreso actualizado" : "Egreso registrado");
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

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = item.concepto.toLowerCase().includes(searchLower) || 
                           item.tipo.toLowerCase().includes(searchLower);
      const matchesTipo = filterTipo === 'Todos los tipos' || item.tipo === filterTipo;
      
      // Filtro por rango de fechas
      const itemDate = item.fecha.split('T')[0];
      const matchesDate = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);

      return matchesSearch && matchesTipo && matchesDate;
    });
  }, [items, searchTerm, filterTipo, startDate, endDate]);

  const columns = [
    columnHelper.accessor('fecha', {
      header: 'Fecha',
      cell: info => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="font-medium">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('tipo', {
      header: 'Tipo',
      cell: info => {
        const value = info.getValue();
        return (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
            value === 'Insumos' ? "bg-blue-50 text-blue-600" : 
            value === 'Sueldo' ? "bg-purple-50 text-purple-600" : 
            value === 'Pasajes' ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"
          )}>
            {value}
          </div>
        );
      },
    }),
    columnHelper.accessor('concepto', {
      header: 'Concepto',
      cell: info => <span className="text-slate-700 font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('monto', {
      header: 'Monto',
      cell: info => <span className="font-bold text-rose-600">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleOpenModal(info.row.original)} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors">
            <Pencil size={16} />
          </button>
          <button onClick={() => handleDelete(info.row.original.egreso_id)} className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors">
            <Trash2 size={16} />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Egresos</h2>
          <p className="text-slate-500">Control de gastos operativos, insumos y otros.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
        >
          <Plus size={20} />
          Nuevo Egreso
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar egreso..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <Calendar size={16} className="text-slate-400" />
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  className="bg-transparent border-none text-xs font-bold focus:ring-0 text-slate-600 outline-none cursor-pointer"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-slate-300 font-bold px-1 text-[10px]">AL</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-xs font-bold focus:ring-0 text-slate-600 outline-none cursor-pointer"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <select 
              className="bg-slate-50 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none font-medium text-slate-600"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option>Todos los tipos</option>
              <option>Insumos</option>
              <option>Pasajes</option>
              <option>Almuerzo</option>
              <option>Sueldo</option>
              <option>Desayuno</option>
              <option>Salidas</option>
              <option>Gasolina</option>
              <option>Lonch</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-slate-50/50">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                    No se registraron egresos.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 text-sm">
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

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Egreso' : 'Nuevo Egreso'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Fecha</label>
                  <input type="date" required className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tipo</label>
                  <select className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                    <option value="Insumos">Insumos</option>
                    <option value="Pasajes">Pasajes</option>
                    <option value="Almuerzo">Almuerzo</option>
                    <option value="Sueldo">Sueldo</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Concepto / Descripción</label>
                <input required placeholder="Ej: Compra de cajas de cartón" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Monto (S/.)</label>
                  <input type="number" step="0.01" required placeholder="0.00" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.monto} onChange={e => setFormData({...formData, monto: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Proveedor</label>
                  <select className="w-full p-3 bg-slate-50 border-none rounded-xl" value={formData.proveedor_id} onChange={e => setFormData({...formData, proveedor_id: e.target.value})}>
                    <option value="">Ninguno</option>
                    {proveedores.map(p => (
                      <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg">
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
