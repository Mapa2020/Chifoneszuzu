import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Phone,
  MapPin,
  Tag,
  CreditCard,
  MoreVertical,
  X,
  Pencil,
  Trash2
} from 'lucide-react';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { useAuth } from '../authcontext';
import { toast } from 'sonner';
import { Cliente } from '../types';
import { cn } from '../lib/utils';

const columnHelper = createColumnHelper<Cliente>();

export default function Clientes() {
  const { user } = useAuth();
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Snack' as 'Snack' | 'Externo' | 'Especial',
    telefono: '',
    direccion: ''
  });

  const fetchClientes = useCallback(() => {
    if (!user?.token) return;
    setLoading(true);
    fetch('/api/clientes', {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener clientes');
        return res.json();
      })
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setItems([]);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingId(cliente.cliente_id);
      setFormData({
        nombre: cliente.nombre,
        categoria: cliente.categoria,
        telefono: cliente.telefono,
        direccion: cliente.direccion
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', categoria: 'Snack', telefono: '', direccion: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/clientes/${editingId}` : '/api/clientes';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      toast.success(editingId ? "Cliente actualizado" : "Cliente guardado");
      setShowModal(false);
      fetchClientes();
    } else {
      const data = await res.json();
      toast.error(data.error || "Error al procesar la solicitud");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      const res = await fetch(`/api/clientes/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      if (res.ok) {
        toast.success("Cliente eliminado");
        fetchClientes();
      } else {
        const data = await res.json();
        toast.error(data.error || "No se pudo eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Nombre',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${info.getValue()}`} alt="Avatar" />
          </div>
          <span className="font-semibold text-slate-800">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('categoria', {
      header: 'Categoría',
      cell: info => {
        const value = info.getValue();
        return (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
            value === 'Snack' ? "bg-orange-50 text-orange-600" : 
            value === 'Externo' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
          )}>
            <Tag size={12} />
            {value}
          </div>
        );
      },
    }),
    columnHelper.accessor('telefono', {
      header: 'Teléfono',
      cell: info => (
        <div className="flex items-center gap-2 text-slate-500">
          <Phone size={14} />
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('direccion', {
      header: 'Dirección',
      cell: info => (
        <div className="flex items-center gap-2 text-slate-500 truncate max-w-50">
          <MapPin size={14} />
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('tarjeta_snack', {
      header: 'Tarjeta Snack',
      cell: info => (
        <div className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center",
          info.getValue() ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
        )}>
          <CreditCard size={14} />
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleOpenModal(info.row.original)}
            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={() => handleDelete(info.row.original.cliente_id)}
            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors"
          >
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
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500">Administra las categorías y datos de tus clientes.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200"
        >
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                    No hay clientes registrados.
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

      {/* Modal de Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nombre Completo</label>
                <input required className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Categoría</label>
                <select 
                  className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                  value={formData.categoria}
                  onChange={e => setFormData({...formData, categoria: e.target.value as any})}
                >
                  <option value="Snack">Snack (Interno)</option>
                  <option value="Externo">Externo</option>
                  <option value="Especial">Especial</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Teléfono</label>
                  <input className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Dirección</label>
                <input className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200 transition-all">
                  {editingId ? 'Actualizar' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
