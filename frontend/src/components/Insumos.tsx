import  React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle,
  MoreVertical,
  Package,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Settings2,
  Download,
  History
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { Ingrediente } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<Ingrediente>();

interface ProveedorMin {
  proveedor_id: number;
  nombre: string;
}

export default function Insumos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Ingrediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [selectedIngName, setSelectedIngName] = useState('');

  const [showNewIngModal, setShowNewIngModal] = useState(false);
  const [editingIngId, setEditingIngId] = useState<number | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorMin[]>([]);
  
  // Estado para el formulario
  const [formData, setFormData] = useState({
    ingrediente_id: '',
    cantidad: '',
    costo: '',
    proveedor_id: ''
  });

  // Formulario de Nuevo Insumo Base
  const [newIngData, setNewIngData] = useState({
    nombre: '', unidad_medida: 'kg', stock_minimo: '1', costo_unitario: '0'
  });

  const fetchInsumos = () => {
    fetch('/api/ingredientes', {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInsumos();
    fetch('/api/proveedores', {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    }).then(res => res.json()).then(setProveedores);
  }, [user]);

  const handleOpenEditModal = (ing: Ingrediente) => {
    setEditingIngId(ing.ingrediente_id);
    setNewIngData({
      nombre: ing.nombre,
      unidad_medida: ing.unidad_medida,
      stock_minimo: ing.stock_minimo.toString(),
      costo_unitario: (ing.costo_unitario || 0).toString()
    });
    setShowNewIngModal(true);
  };

  const fetchHistory = async (id: number, name: string) => {
    setSelectedIngName(name);
    try {
      const res = await fetch(`/api/ingredientes/${id}/historial`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await res.json();
      setHistoryItems(Array.isArray(data) ? data : []);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error("Error al cargar el historial de precios");
    }
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingIngId ? 'PUT' : 'POST';
    const url = editingIngId ? `/api/ingredientes/${editingIngId}` : '/api/ingredientes';

    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.token}`
      },
      body: JSON.stringify({
        ...newIngData,
        stock_minimo: parseFloat(newIngData.stock_minimo),
        costo_unitario: parseFloat(newIngData.costo_unitario)
      })
    });

    if (res.ok) {
      toast.success(editingIngId ? "Insumo actualizado" : "Insumo creado");
      setShowNewIngModal(false);
      setEditingIngId(null);
      setNewIngData({ nombre: '', unidad_medida: 'kg', stock_minimo: '1', costo_unitario: '0' });
      fetchInsumos();
    } else {
      toast.error("Error al guardar el insumo");
    }
  };

  const handleIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ingredientes/ingreso', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ...formData,
          cantidad: parseFloat(formData.cantidad),
          costo: parseFloat(formData.costo),
          proveedor_id: formData.proveedor_id || null
        })
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ ingrediente_id: '', cantidad: '', costo: '', proveedor_id: '' });
        fetchInsumos();
      }
    } catch (error) {
      console.error("Error al registrar ingreso:", error);
    }
  };

  const exportCriticalPDF = () => {
    const criticalItems = items.filter(i => i.stock_actual <= i.stock_minimo);
    
    if (criticalItems.length === 0) {
      alert("No hay insumos con stock crítico para exportar.");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Reporte de Stock Crítico - Chifones Zuzú", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Ingrediente', 'Unidad', 'Stock Actual', 'Mínimo', 'Costo Unit.']],
      body: criticalItems.map(i => [
        i.nombre, 
        i.unidad_medida, 
        i.stock_actual, 
        i.stock_minimo, 
        `S/ ${Number(i.costo_unitario || 0).toFixed(2)}`
      ]),
      headStyles: { fillColor: [244, 63, 94] }, // Color rose-500
      styles: { fontSize: 9 }
    });

    doc.save(`insumos-criticos-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const columns = [
    columnHelper.accessor('nombre', {
      header: 'Ingrediente',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <Package size={16} />
          </div>
          <span className="font-semibold text-slate-800">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('unidad_medida', {
      header: 'Unidad',
      cell: info => <span className="text-slate-500 font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('stock_actual', {
      header: 'Stock Actual',
      cell: info => {
        const stock = info.getValue();
        const min = info.row.original.stock_minimo;
        const isLow = stock <= min;
        return (
          <div className="flex items-center gap-2">
            <span className={cn("font-bold", isLow ? "text-red-600" : "text-slate-900")}>
              {stock}
            </span>
            {isLow && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
          </div>
        );
      },
    }),
    columnHelper.accessor('stock_minimo', {
      header: 'Stock Mínimo',
      cell: info => <span className="text-slate-400 font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('costo_unitario', {
      header: 'Costo Unit.',
      cell: info => <span className="font-bold text-slate-700">{formatCurrency(info.getValue() || 0)}</span>,
    }),
    columnHelper.display({
      id: 'status',
      header: 'Estado',
      cell: info => {
        const stock = info.row.original.stock_actual;
        const min = info.row.original.stock_minimo;
        const isLow = stock <= min;
        return (
          <div className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold",
            isLow ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
          )}>
            {isLow ? "Reabastecer" : "Ok"}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleOpenEditModal(info.row.original)}
            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button 
            onClick={() => fetchHistory(info.row.original.ingrediente_id, info.row.original.nombre)}
            className="p-1.5 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-slate-400 transition-colors"
            title="Ver Historial de Precios"
          >
            <History size={16} />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
                    <h2 className="text-2xl font-bold text-slate-800">Insumos e Ingredientes</h2>
          <p className="text-slate-500">Control de inventario y alertas de reabastecimiento.</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button 
            onClick={() => setShowNewIngModal(true)}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"
          >
            <Settings2 size={20} />
            Nuevo Insumo
          </button>
          <button 
            onClick={exportCriticalPDF}
            className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-rose-200 text-sm"
          >
            <Download size={20} />
            PDF Críticos
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 text-sm"
          >
            <Plus size={20} />
            Registrar Compra
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Items</p>
          <p className="text-2xl font-bold text-slate-800">{items.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Stock Crítico</p>
          <p className="text-2xl font-bold text-red-600">
            {items.filter(i => i.stock_actual <= i.stock_minimo).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Inversión en Almacén</p>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(items.reduce((acc, i) => acc + (i.stock_actual * i.costo_unitario), 0))}
          </p>
        </div>
      </div>

      {/* Tabla de Insumos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                    No hay insumos registrados.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const isLow = row.original.stock_actual <= row.original.stock_minimo;
                  return (
                  <tr 
                    key={row.id} 
                    className={cn(
                      "border-b border-slate-50 transition-colors",
                      isLow ? "bg-rose-50/70 hover:bg-rose-100/80" : "hover:bg-slate-50/50"
                    )}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Nuevo Insumo Base */}
      {showNewIngModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{editingIngId ? 'Editar Insumo' : 'Definir Nuevo Insumo'}</h3>
              <button onClick={() => { setShowNewIngModal(false); setEditingIngId(null); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveIngredient} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nombre del Insumo</label>
                <input required placeholder="Ej: Harina de Trigo Especial" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={newIngData.nombre} onChange={e => setNewIngData({...newIngData, nombre: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Unidad de Medida</label>
                  <select className="w-full p-3 bg-slate-50 border-none rounded-xl" value={newIngData.unidad_medida} onChange={e => setNewIngData({...newIngData, unidad_medida: e.target.value})}>
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="gr">Gramos (gr)</option>
                    <option value="Uni">Unidades (Uni)</option>
                    <option value="lt">Litros (lt)</option>
                    <option value="Doc">Docena (Doc)</option>
                    <option value="Mt">Metros (mt)</option>
                    <option value="cm">Centímetros (cm)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Stock Crítico</label>
                  <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border-none rounded-xl" value={newIngData.stock_minimo} onChange={e => setNewIngData({...newIngData, stock_minimo: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Costo Unitario Actual (S/.)</label>
                <input type="number" step="0.0001" className="w-full p-3 bg-orange-50 border-none rounded-xl font-bold text-orange-700" value={newIngData.costo_unitario} onChange={e => setNewIngData({...newIngData, costo_unitario: e.target.value})} />
                <p className="text-[10px] text-slate-400 italic">* Este valor actualiza automáticamente el costo de producción de todos los chifones.</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setShowNewIngModal(false); setEditingIngId(null); }} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg">{editingIngId ? 'Actualizar' : 'Guardar Insumo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nuevo Ingreso */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Ingreso de Mercadería</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleIngreso} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Seleccionar Insumo</label>
                <select 
                  required
                  className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                  value={formData.ingrediente_id}
                  onChange={e => setFormData({...formData, ingrediente_id: e.target.value})}
                >
                  <option value="">Seleccione...</option>
                  {items.map(i => (
                    <option key={i.ingrediente_id} value={i.ingrediente_id}>
                      {i.nombre} (Stock actual: {i.stock_actual} {i.unidad_medida})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Proveedor (Opcional)</label>
                <select 
                  className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                  value={formData.proveedor_id}
                  onChange={e => setFormData({...formData, proveedor_id: e.target.value})}
                >
                  <option value="">Seleccione proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.proveedor_id} value={p.proveedor_id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Cantidad</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                    value={formData.cantidad}
                    onChange={e => setFormData({...formData, cantidad: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Costo Total (S/.)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                    value={formData.costo}
                    onChange={e => setFormData({...formData, costo: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200 transition-all"
                >
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Historial de Precios */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Evolución de Costo</h3>
                <p className="text-xs text-slate-500 font-medium">Insumo: {selectedIngName}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-8">
              <div className="h-64 w-full block relative min-h-64">
                {historyItems.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyItems}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="fecha" 
                        tick={{fontSize: 10, fill: '#94a3b8'}} 
                        axisLine={false}
                        tickFormatter={(str) => new Date(str).toLocaleDateString()}
                      />
                      <YAxis 
                        tick={{fontSize: 10, fill: '#94a3b8'}} 
                        axisLine={false}
                        tickFormatter={(val) => `S/ ${val}`}
                      />
                      <ChartTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="costo_unitario" 
                        stroke="#f97316" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#f97316' }} 
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                    <History size={40} className="mb-2 opacity-20" />
                    <p className="text-sm italic">No hay suficientes registros para generar el gráfico.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-50">
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
