import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, UtensilsCrossed, Trash2, X, ChefHat, Pencil, Info, Save, AlertTriangle, ChevronRight, ChevronLeft, Beaker } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../authcontext';
import { toast } from 'sonner';

export default function Productos() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<any[]>([]);
  const [ingredientes, setIngredientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [step, setStep] = useState(1); // 1: Info General, 2: Receta

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    sabor: '',
    precio_snack: '',
    precio_externo: '',
    precio_especial: ''
  });
  const [recetaItems, setRecetaItems] = useState<any[]>([]);

  // Auxiliares para receta
  const [selectedIng, setSelectedIng] = useState('');
  const [cantidadIng, setCantidadIng] = useState('');

  const fetchAll = async () => {
    if (!user?.token) return;
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${user.token}` };
    const [pRes, iRes] = await Promise.all([
      fetch('/api/productos', { headers }).then(r => r.json()),
      fetch('/api/ingredientes', { headers }).then(r => r.json())
    ]);
    setProductos(pRes);
    setIngredientes(iRes);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const handleNextStep = () => {
    // Si es un producto nuevo y no tiene ingredientes aún, cargamos la base
    if (!editingId && recetaItems.length === 0) {
      const baseIngredients = [
        { search: 'Harina', qty: 0.285 },
        { search: 'Huevo', qty: 8 },
        { search: 'Azúcar', qty: 0.25 },
        { search: 'Aceite', qty: 0.14},
        { search: 'Sal', qty: 0.05},
        { search: 'Maizena', qty: 0.032},
        { search: 'Cremor Tartaro', qty: 0.025},
        { search: 'Polvo', qty: 0.02 } // Polvo de hornear
      ];

      const loadedBase = baseIngredients.map(base => {
        const found = ingredientes.find(i => i.nombre.toLowerCase().includes(base.search.toLowerCase()));
        if (found) {
          return {
            ingrediente_id: found.ingrediente_id,
            nombre: found.nombre,
            cantidad_necesaria: Number(base.qty), // Asegura que sea un número
            unidad: found.unidad_medida,
            costo_unitario: found.costo_unitario || 0
          };
        }
        return null;
      }).filter(Boolean);

      if (loadedBase.length > 0) {
        setRecetaItems(loadedBase);
        toast.info("Receta base predeterminada cargada");
      }
    }
    setStep(2);
  };

  const handleOpenModal = async (prod?: any) => {
    setStep(1);
    if (prod) {
      setEditingId(prod.producto_id);
      const res = await fetch(`/api/productos/${prod.producto_id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const fullData = await res.json();
      setFormData({
        nombre: fullData.nombre,
        sabor: fullData.sabor,
        precio_snack: fullData.precio_snack.toString(),
        precio_externo: fullData.precio_externo.toString(),
        precio_especial: fullData.precio_especial.toString()
      });
      setRecetaItems((fullData.receta || []).map((item: any) => ({ ...item, cantidad_necesaria: Number(item.cantidad_necesaria) || 0 }))); // Asegura que sean números
    } else {
      setEditingId(null);
      setFormData({ nombre: '', sabor: '', precio_snack: '', precio_externo: '', precio_especial: '' });
      setRecetaItems([]);
    }
    setShowModal(true);
  };

  const costoTotalProduccion = useMemo(() => {
    return recetaItems.reduce((acc, item) => acc + (item.cantidad_necesaria * item.costo_unitario), 0);
  }, [recetaItems]);

  const margenGanancia = useMemo(() => {
    const p = parseFloat(formData.precio_snack) || 0;
    if (p === 0) return 0;
    return ((p - costoTotalProduccion) / p) * 100;
  }, [formData.precio_snack, costoTotalProduccion]);

  const agregarAReceta = () => {
    if (!selectedIng || !cantidadIng) return;
    const ing = ingredientes.find(i => i.ingrediente_id === parseInt(selectedIng));
    if (!ing) return;

    setRecetaItems([...recetaItems, {
      ingrediente_id: ing.ingrediente_id,
      nombre: ing.nombre,
      cantidad_necesaria: parseFloat(cantidadIng) || 0, // Asegura que sea un número, por defecto 0
      unidad: ing.unidad_medida,
      costo_unitario: ing.costo_unitario || 0
    }]);
    setSelectedIng('');
    setCantidadIng('');
  };

  const quitarDeReceta = (index: number) => {
    setRecetaItems(recetaItems.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recetaItems.length === 0) return toast.error("La receta no puede estar vacía");

    const url = editingId ? `/api/productos/${editingId}` : '/api/productos';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`
      },
      body: JSON.stringify({
        ...formData,
        precio_snack: parseFloat(formData.precio_snack),
        precio_externo: parseFloat(formData.precio_externo),
        precio_especial: parseFloat(formData.precio_especial),
        receta: recetaItems
      })
    });

    if (res.ok) {
      toast.success(editingId ? "Producto actualizado" : "Producto creado");
      setShowModal(false);
      fetchAll();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este producto y su receta?')) return;
    const res = await fetch(`/api/productos/${id}`, { 
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${user?.token}`
      }
    });
    if (res.ok) fetchAll();
    else {
      const data = await res.json();
      alert(data.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Catálogo de Productos</h2>
          <p className="text-slate-500">Define tus sabores de chifón y sus fórmulas de producción.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-200"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos.map(p => {
          const margin = p.precio_snack > 0 
            ? ((p.precio_snack - (p.costo_produccion || 0)) / p.precio_snack) * 100 
            : 0;
          const isCritical = margin < 20;

          return (
            <div key={p.producto_id} className={cn(
              "bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group relative",
              isCritical ? "border-rose-200 bg-rose-50/20" : "border-slate-100"
            )}>
              {isCritical && (
                <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-1.5 rounded-full shadow-lg z-10 animate-bounce" title={`Margen crítico: ${margin.toFixed(1)}%`}>
                  <AlertTriangle size={16} />
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  isCritical ? "bg-rose-100 text-rose-600" : "bg-orange-50 text-orange-600"
                )}>
                  <ChefHat size={24} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(p.producto_id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h4 className="font-bold text-slate-800 text-lg">{p.nombre}</h4>
              <p className="text-sm text-slate-500 mb-4">{p.sabor}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className={cn("font-black text-xl", isCritical ? "text-rose-600" : "text-orange-600")}>
                  {formatCurrency(p.precio_snack)}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">PVP</span>
              </div>
            </div>
          );
        })}
      </div>


      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={cn(
            "bg-white rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300",
            step === 1 ? "max-w-md" : "max-w-2xl"
          )}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Chifón' : 'Nuevo Chifón'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("h-1.5 w-8 rounded-full transition-all", step >= 1 ? "bg-orange-500" : "bg-slate-100")} />
                  <div className={cn("h-1.5 w-8 rounded-full transition-all", step >= 2 ? "bg-orange-500" : "bg-slate-100")} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Paso {step} de 2</span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              {step === 1 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Info size={18} className="text-orange-500" />
                      <h4 className="font-bold">Datos del Producto</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre Comercial</label>
                        <input required placeholder="Ej: Chifón Familiar" className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sabor / Variedad</label>
                        <input required placeholder="Ej: Marmoleado" className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.sabor} onChange={e => setFormData({...formData, sabor: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-50">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-3 block">Lista de Precios (S/.)</label>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-2xl border border-orange-100">
                          <label className="text-[10px] font-black text-orange-600 uppercase w-20">PVP Snack</label>
                          <input required type="number" step="0.01" className="flex-1 bg-transparent text-orange-700 font-bold border-none outline-none text-right" value={formData.precio_snack} onChange={e => setFormData({...formData, precio_snack: e.target.value})} />
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-500 uppercase w-20">Externo</label>
                          <input required type="number" step="0.01" className="flex-1 bg-transparent text-slate-700 font-bold border-none outline-none text-right" value={formData.precio_externo} onChange={e => setFormData({...formData, precio_externo: e.target.value})} />
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-500 uppercase w-20">Especial</label>
                          <input required type="number" step="0.01" className="flex-1 bg-transparent text-slate-700 font-bold border-none outline-none text-right" value={formData.precio_especial} onChange={e => setFormData({...formData, precio_especial: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    disabled={!formData.nombre || !formData.sabor || !formData.precio_snack}
                    onClick={handleNextStep}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    Configurar Receta <ChevronRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 space-y-4">
                    <div className="flex items-center gap-2 text-slate-800 mb-2">
                      <Beaker size={18} className="text-orange-500" />
                      <h4 className="font-bold">Composición de la Receta</h4>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select 
                        className="flex-1 p-3 bg-white border-none rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
                        value={selectedIng}
                        onChange={e => setSelectedIng(e.target.value)}
                      >
                        <option value="">Seleccionar Ingrediente...</option>
                        {ingredientes.map(i => <option key={i.ingrediente_id} value={i.ingrediente_id}>{i.nombre} ({i.unidad_medida}) - {formatCurrency(i.costo_unitario || 0)}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <input 
                          type="number" step="0.0001" placeholder="Cant." 
                          className="w-24 p-3 bg-white border-none rounded-xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
                          value={cantidadIng}
                          onChange={e => setCantidadIng(e.target.value)}
                        />
                        <button type="button" onClick={agregarAReceta} className="px-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-100"><Plus size={20} /></button>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                      {recetaItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <span className="font-medium text-slate-700 text-sm">{item.nombre}</span>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-slate-900 text-xs">{item.cantidad_necesaria} {item.unidad}</p>
                              <p className="text-[10px] text-slate-400">{formatCurrency(item.cantidad_necesaria * item.costo_unitario)}</p>
                            </div>
                            <button type="button" onClick={() => quitarDeReceta(idx)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                      {recetaItems.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                          Aún no has añadido ingredientes a la receta
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800 rounded-2xl text-white">
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Costo Producción</p>
                      <p className="text-xl font-black">{formatCurrency(costoTotalProduccion)}</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-white transition-all shadow-lg",
                      margenGanancia > 40 ? "bg-emerald-500 shadow-emerald-100" : margenGanancia > 20 ? "bg-amber-500 shadow-amber-100" : "bg-rose-500 shadow-rose-100"
                    )}>
                      <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Margen Proyectado</p>
                      <p className="text-xl font-black">{margenGanancia.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-4 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center gap-2 transition-all"><ChevronLeft size={18} /> Volver</button>
                    <button type="submit" disabled={recetaItems.length === 0} className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-black rounded-2xl shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"><Save size={18} /> Finalizar Guardado</button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}