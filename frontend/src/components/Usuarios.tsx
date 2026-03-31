import React, { useState, useEffect } from 'react';
import { Plus, User, Shield, X, Trash2, Pencil, Key } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ username: '', password: '', rol: 'Vendedor' });

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
      setFormData({ username: u.username, password: '', rol: u.rol });
    } else {
      setEditingId(null);
      setFormData({ username: '', password: '', rol: 'Vendedor' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const data = await res.json();
      toast.error(data.error);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuarios.map(u => (
          <div key={u.usuario_id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                u.rol === 'Administrador' ? "bg-orange-100 text-orange-600" : 
                u.rol === 'Vendedor' ? "bg-emerald-100 text-emerald-600" : 
                "bg-blue-100 text-blue-600"
              )}>
                {u.rol === 'Administrador' ? <Shield size={24} /> : <User size={24} />}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{u.username}</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{u.rol}</p>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(u)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-orange-500 rounded-lg"><Pencil size={18} /></button>
              <button onClick={() => handleDelete(u.usuario_id)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
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