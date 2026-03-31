import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Truck,
  Phone,
  MapPin,
  MoreVertical,
  X,
  Pencil,
  Trash2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';

interface Proveedor {
  proveedor_id: number;
  nombre: string;
  telefono: string;
  direccion: string;
}

const columnHelper = createColumnHelper<Proveedor>();

export default function Proveedores() {
  const { user } = useAuth();
  const [items, setItems] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', telefono: '', direccion: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProveedores = useCallback(() => {
    if (!user?.token) return;
    setLoading(true);
    fetch('/api/proveedores', {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar proveedores');
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
    fetchProveedores();
  }, [fetchProveedores]);

  const handleOpenModal = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingId(proveedor.proveedor_id);
      setFormData({
        nombre: proveedor.nombre,
        telefono: proveedor.telefono,
        direccion: proveedor.direccion
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', telefono: '', direccion: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/proveedores/${editingId}` : '/api/proveedores';
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
        toast.success(editingId ? "Proveedor actualizado" : "Proveedor registrado");
        setShowModal(false);
        setEditingId(null);
        setFormData({ nombre: '', telefono: '', direccion: '' });
        fetchProveedores();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Error al procesar la solicitud.");
      }
    } catch (error) {
      console.error("Error en la petición:", error);
      toast.error("No se pudo conectar con el servidor.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este proveedor?')) return;
    
    try {
      const res = await fetch(`/api/proveedores/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      if (res.ok) {
        toast.success("Proveedor eliminado");
        fetchProveedores();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "No se pudo eliminar el proveedor.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión");
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Empresa / Proveedor',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Truck size={16} />
          </div>
          <span className="font-semibold text-slate-800">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('telefono', {
      header: 'Contacto',
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
        <div className="flex items-center gap-2 text-slate-500 truncate max-w-60">
          <MapPin size={14} />
          {info.getValue()}
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
            onClick={() => handleDelete(info.row.original.proveedor_id)}
            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: filteredItems || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Proveedores</h2>
          <p className="text-slate-500">Gestiona las empresas que suministran tus insumos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
        >
          <Plus size={20} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar proveedor..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => <th key={h.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center font-medium text-slate-400 italic">Cargando proveedores...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No hay proveedores registrados.</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map(cell => <td key={cell.id} className="px-6 py-4 text-sm">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
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
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Editar Proveedor' : 'Registrar Proveedor'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Nombre / Razón Social</label><input required className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Teléfono</label><input className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Dirección</label><input className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} /></div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg transition-all">
                  {editingId ? 'Actualizar Cambios' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}