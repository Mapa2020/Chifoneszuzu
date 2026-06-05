import React, { useState, useEffect, useMemo } from 'react';
import { Plus, User, Shield, X, Trash2, Pencil, Key, Ban, UserCheck, Search } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';

const columnHelper = createColumnHelper<any>();

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({ username: '', password: '', rol: 'Vendedor', activo: 1 });

  const isAdmin = currentUser?.rol === 'Administrador';

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Error al cargar usuarios");
      
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const handleOpenModal = (u?: any) => {
    if (u) {
      setEditingId(u.usuario_id);
      setFormData({ username: u.username, password: '', rol: u.rol, activo: u.activo });
    } else {
      setEditingId(null);
      setFormData({ username: '', password: '', rol: 'Vendedor', activo: 1 });
    }
    setShowModal(true);
  };

  const handleToggleStatus = async (usuario: any) => {
    if (usuario.usuario_id === currentUser?.usuario_id) return toast.error("No puedes bloquear tu propia cuenta");
    
    const nuevoEstado = usuario.activo === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/usuarios/${usuario.usuario_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ ...usuario, activo: nuevoEstado })
      });

      if (res.ok) {
        toast.success(nuevoEstado === 0 ? "Usuario bloqueado" : "Usuario activado");
        fetchUsuarios();
      } else {
        toast.error("Error al cambiar estado");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return toast.error("No tienes permisos para esta acción");

    const url = editingId ? `/api/usuarios/${editingId}` : '/api/usuarios';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser?.token}`
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      toast.success(editingId ? "Usuario actualizado" : "Usuario creado");
      setShowModal(false);
      fetchUsuarios();
    } else {
      try {
        const data = await res.json();
        toast.error(data.error || "Error en el servidor");
      } catch (e) {
        toast.error("Error crítico en el servidor (500)");
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.usuario_id) return toast.error("No puedes eliminarte a ti mismo");
    if (!confirm('¿Eliminar esta cuenta de acceso?')) return;
    
    const res = await fetch(`/api/usuarios/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentUser?.token}` }
    });
    if (res.ok) {
      toast.success("Usuario eliminado");
      fetchUsuarios();
    }
  };

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [usuarios, searchTerm]);

  const columns = [
    columnHelper.accessor('username', {
      header: 'Usuario',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            info.row.original.rol === 'Administrador' ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"
          )}>
            {info.row.original.rol === 'Administrador' ? <Shield size={16} /> : <User size={16} />}
          </div>
          <span className="font-bold text-slate-800">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('rol', {
      header: 'Rol de Acceso',
      cell: info => <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{info.getValue()}</span>,
    }),
    columnHelper.accessor('activo', {
      header: 'Estado',
      cell: info => (
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
          info.getValue() === 1 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", info.getValue() === 1 ? "bg-emerald-500" : "bg-rose-500")} />
          {info.getValue() === 1 ? 'Activo' : 'Bloqueado'}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: info => {
        const u = info.row.original;
        const isSelf = u.usuario_id === currentUser?.usuario_id;
        return (
          <div className="flex items-center gap-1">
            <button onClick={() => handleOpenModal(u)} className="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-500 rounded-lg transition-colors" title="Editar">
              <Pencil size={18} />
            </button>
            <button 
              onClick={() => handleToggleStatus(u)} 
              disabled={isSelf}
              className={cn(
                "p-2 rounded-lg transition-colors",
                u.activo === 1 
                  ? "hover:bg-amber-50 text-slate-400 hover:text-amber-600" 
                  : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600",
                isSelf && "opacity-20 cursor-not-allowed"
              )}
              title={u.activo === 1 ? "Bloquear Acceso" : "Activar Acceso"}
            >
              {u.activo === 1 ? <Ban size={18} /> : <UserCheck size={18} />}
            </button>
            <button 
              onClick={() => handleDelete(u.usuario_id)} 
              disabled={isSelf}
              className={cn("p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors", isSelf && "opacity-20 cursor-not-allowed")}
              title="Eliminar Permanente"
            >
              <Trash2 size={18} />
            </button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: filteredUsuarios,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
          <p className="text-slate-500">Administra quiénes tienen acceso al sistema y sus permisos.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200">
          <Plus size={20} /> Nuevo Acceso
        </button>
      </div>
    
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 animate-pulse">Cargando usuarios...</td></tr>
              ) : filteredUsuarios.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No se encontraron usuarios.</td></tr>
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
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Usuario' : 'Crear Acceso'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nombre de Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required={!editingId} type="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Rol de Acceso</label>
                <select className="w-full p-3 bg-slate-50 border-none rounded-xl font-medium" value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                  <option value="Vendedor">Vendedor (Operativo)</option>
                  <option value="Administrador">Administrador (Total)</option>
                  <option value="Cliente">Cliente (App Móvil)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg">
                  {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}