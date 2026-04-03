import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Download,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  X,
  Trash2,
  AlertTriangle,
  Printer,
  Check,
  User,
  Pencil
} from 'lucide-react';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { Venta } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

interface DetalleVentaTmp {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

const columnHelper = createColumnHelper<Venta>();

export default function Ventas() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  interface LastSaleInfo {
    ventaId: number;
    cliente: string;
    fecha: string;
    detalles: DetalleVentaTmp[];
    total: number;
    formaPago: string;
  }
  const [lastSale, setLastSale] = useState<LastSaleInfo | null>(null);
  
  // Estados para el formulario de nueva venta
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [ingredientes, setIngredientes] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [detalles, setDetalles] = useState<DetalleVentaTmp[]>([]);
  const [clienteId, setClienteId] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formaPago, setFormaPago] = useState<string>('Contado');
  const [fechaVenta, setFechaVenta] = useState<string>(new Date().toISOString().split('T')[0]);

  const selectedCliente = useMemo(() => 
    clientes.find(c => c.cliente_id === parseInt(clienteId)), 
  [clientes, clienteId]);

  const fetchVentas = () => {
    setLoading(true);
    fetch('/api/ventas', {
      headers: {
        'Authorization': `Bearer ${user?.token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setVentas(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVentas();
    const headers = { 'Authorization': `Bearer ${user?.token}` };
    
    // Cargar maestros para el modal
    fetch('/api/productos', { headers })
      .then(res => res.json())
      .then(setProductos);
    fetch('/api/clientes', { headers })
      .then(res => res.json())
      .then(setClientes);
    fetch('/api/ingredientes', { headers })
      .then(res => res.json())
      .then(setIngredientes);
    fetch('/api/recetas', { headers })
      .then(res => res.json())
      .then(setRecetas);
  }, []);

  // Lógica de filtrado combinada: Búsqueda y Rango de Fechas
  const filteredVentas = useMemo(() => {
    return ventas.filter(v => {
      // Filtro por término de búsqueda (Cliente, ID o Forma de Pago)
      const searchMatch = !searchTerm || 
        v.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.venta_id.toString().includes(searchTerm) ||
        v.forma_pago.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      // Filtro por rango de fechas (v.fecha está en formato YYYY-MM-DD)
      const vDate = v.fecha;
      if (startDate && vDate < startDate) return false;
      if (endDate && vDate > endDate) return false;

      return true;
    });
  }, [ventas, searchTerm, startDate, endDate]);

  // Lógica de validación de stock en tiempo real
  const missingStock = useMemo(() => {
    const needed: Record<number, number> = {};
    
    detalles.forEach(d => {
      // Si es >= 10, sumamos 1 por el regalo (lógica 10+1)
      const quantityToCook = d.cantidad >= 10 ? d.cantidad + 1 : d.cantidad;
      const productRecipes = recetas.filter(r => r.producto_id === d.producto_id);
      
      productRecipes.forEach(r => {
        needed[r.ingrediente_id] = (needed[r.ingrediente_id] || 0) + (r.cantidad_necesaria * quantityToCook);
      });
    });

    const missing: string[] = [];
    Object.entries(needed).forEach(([id, amount]) => {
      const ing = ingredientes.find(i => i.ingrediente_id === parseInt(id));
      if (ing && ing.stock_actual < amount) {
        missing.push(`${ing.nombre} (Necesario: ${amount.toFixed(3)}${ing.unidad_medida}, Disponible: ${Number(ing.stock_actual).toFixed(3)}${ing.unidad_medida})`);
      }
    });

    return missing;
  }, [detalles, recetas, ingredientes]);

  const canSave = detalles.length > 0 && 
                  missingStock.length === 0 && 
                  (formaPago !== 'CreditoDia' || !!clienteId);

  const totalVenta = useMemo(() => 
    detalles.reduce((acc, d) => acc + Number(d.subtotal), 0), 
  [detalles]);

  const agregarProducto = (id: string) => {
    const prod = productos.find(p => p.producto_id === parseInt(id));
    if (!prod) return;

    // Determinar precio según categoría del cliente seleccionado
    let precioAplicado = Number(prod.precio_snack || 0);
    if (selectedCliente?.categoria === 'Externo') precioAplicado = Number(prod.precio_externo || 0);
    if (selectedCliente?.categoria === 'Especial') precioAplicado = Number(prod.precio_especial || 0);

    setDetalles(prev => {
      const index = prev.findIndex(d => d.producto_id === prod.producto_id);
      if (index !== -1) {
        // Si ya existe, incrementamos cantidad y recalculamos subtotal
        return prev.map((item, i) => 
          i === index 
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
            : item
        );
      }
      // Si es nuevo, lo añadimos
      return [...prev, {
        producto_id: prod.producto_id,
        nombre: prod.nombre,
        cantidad: 1,
        precio_unitario: precioAplicado,
        subtotal: precioAplicado
      }];
    });
  };

  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    setDetalles(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precio_unitario }
        : item
    ));
  };

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleEditVenta = async (venta: Venta) => {
    try {
      const res = await fetch(`/api/ventas/${venta.venta_id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const fullVenta = await res.json();
      
      setEditingId(fullVenta.venta_id);
      setClienteId(fullVenta.cliente_id?.toString() || '');
      setFormaPago(fullVenta.forma_pago);
      setFechaVenta(fullVenta.fecha.split('T')[0]);
      setDetalles(fullVenta.detalles.map((d: any) => ({
        producto_id: d.producto_id,
        nombre: d.producto_nombre,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal
      })));
      setShowModal(true);
    } catch (error) {
      toast.error("No se pudieron cargar los detalles para editar");
    }
  };

  const handleDeleteVenta = async (id: number) => {
    const motivo = prompt("Ingrese el motivo de la eliminación (Obligatorio):");
    
    if (motivo === null) return; // El usuario canceló el prompt
    
    if (!motivo.trim()) {
      toast.error("El motivo de eliminación es obligatorio para proceder.");
      return;
    }
    
    const res = await fetch(`/api/ventas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo })
    });
    
    if (res.ok) {
      toast.success("Venta eliminada correctamente");
      fetchVentas();
    }
  };

  const handlePrintVenta = async (venta: Venta) => {
    try {
      const res = await fetch(`/api/ventas/${venta.venta_id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const fullVenta = await res.json();

      setLastSale({
        ventaId: fullVenta.venta_id,
        cliente: fullVenta.cliente_nombre || 'Venta Directa',
        fecha: new Date(fullVenta.fecha).toLocaleDateString(),
        detalles: fullVenta.detalles.map((d: any) => ({
          producto_id: d.producto_id,
          nombre: d.producto_nombre,
          cantidad: d.cantidad,
          subtotal: d.subtotal
        })),
        total: fullVenta.total,
        formaPago: fullVenta.forma_pago
      });
      setShowTicketModal(true);
    } catch (error) {
      toast.error("Error al cargar la venta para imprimir");
    }
  };

  const handleSaveVenta = async () => {
   if (detalles.length === 0) {
      toast.error("Debes agregar al menos un producto");
      return;
    }
    
    const payload = {
      cliente_id: clienteId || null,
      total: totalVenta,
      forma_pago: formaPago,
      fecha: fechaVenta,
      detalles
    };

    try {
      const res = await fetch(editingId ? `/api/ventas/${editingId}` : '/api/ventas', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (!res.ok) {
        toast.error("No se pudo registrar la venta", { description: data.error });
        return;
      }

      if (data.success) {
        setLastSale({
          ventaId: data.ventaId,
          cliente: clientes.find(c => c.cliente_id === parseInt(clienteId))?.nombre || 'Venta Directa',
          fecha: new Date().toLocaleString(),
          detalles: [...detalles],
          total: totalVenta,
          formaPago
        });
        setShowModal(false);
        setShowTicketModal(true);
        setDetalles([]);
        fetchVentas();

        toast.success("Venta completada");

        // Disparar notificaciones de stock bajo
        if (data.alertas && data.alertas.length > 0) {
          data.alertas.forEach((alerta: any) => {
            toast.warning(`Stock Crítico: ${alerta.nombre}`, {
              description: `Quedan solo ${Number(alerta.stock_actual).toFixed(3)} ${alerta.unidad_medida}.`,
              duration: 8000,
            });
          });
        }
      }
    } catch (error) {
      console.error("Error al guardar venta:", error);
      toast.error("Error de conexión con el servidor");
    }
  };

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
    columnHelper.accessor('cliente_nombre', {
      header: 'Cliente',
      cell: info => <span className="text-slate-700">{info.getValue() || 'Venta Directa'}</span>,
    }),
    columnHelper.accessor('vendedor_nombre', {
      header: 'Vendedor',
      cell: info => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-400" />
          <span className="text-slate-500 text-xs font-medium italic">{info.getValue() || 'N/A'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('forma_pago', {
      header: 'Pago',
      cell: info => {
        const value = info.getValue();
        return (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
            value === 'QR' ? "bg-blue-50 text-blue-600" : 
            value === 'Contado' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          )}>
            {value === 'QR' && <QrCode size={12} />}
            {value === 'Contado' && <Banknote size={12} />}
            {value === 'CreditoDia' && <CreditCard size={12} />}
            {value}
          </div>
        );
      },
    }),
    columnHelper.accessor('total', {
      header: 'Total',
      cell: info => <span className="font-bold text-slate-900">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.display({ 
      id: 'actions',
      cell: (info) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handlePrintVenta(info.row.original)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400" title="Re-imprimir">
            <Printer size={16} />
          </button>
          {user?.rol === 'Administrador' && (
            <>
              <button onClick={() => handleEditVenta(info.row.original)} className="p-1.5 hover:bg-orange-50 text-slate-400 hover:text-orange-500 rounded-lg">
                <Pencil size={16} />
              </button>
              <button onClick={() => handleDeleteVenta(info.row.original.venta_id)} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: filteredVentas,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ventas</h2>
          <p className="text-slate-500">Gestiona y visualiza todas las ventas realizadas.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setDetalles([]); setFechaVenta(new Date().toISOString().split('T')[0]); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200"
        >
          <Plus size={20} />
          Nueva Venta
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-3 flex-1 max-w-4xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por cliente, ID o pago..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all font-medium"
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
                <span className="text-slate-300 font-bold px-1">al</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-xs font-bold focus:ring-0 text-slate-600 outline-none cursor-pointer"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="ml-1 p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                  title="Limpiar fechas"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Filter size={16} />
              Filtros
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Download size={16} />
              Exportar
            </button>
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
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron ventas.
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

      {/* Modal de Nueva Venta */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? `Editando Venta #${editingId}` : 'Registrar Nueva Venta'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Fecha de Venta</label>
                  <input 
                    type="date" 
                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                    value={fechaVenta}
                    onChange={(e) => setFechaVenta(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Cliente</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                  >
                    <option value="">Venta Directa</option>
                    {clientes.map(c => <option key={c.cliente_id} value={c.cliente_id}>{c.nombre}</option>)}
                  </select>
                  {selectedCliente && (
                    <div className="flex items-center gap-2 mt-1.5 px-3 py-2 bg-orange-50 rounded-xl border border-orange-100">
                      <CreditCard size={14} className="text-orange-600" />
                      <span className="text-xs font-bold text-orange-700">
                        Puntos acumulados: {selectedCliente.tarjeta_snack}
                        {selectedCliente.categoria === 'Snack' && <span className="text-orange-500 ml-1">(+1 con esta venta)</span>}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Forma de Pago</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                  >
                    <option value="Contado">Contado (Efectivo)</option>
                    <option value="QR">Yape (QR)</option>
                    <option value="CreditoDia">Crédito del Día</option>
                  </select>
                  {formaPago === 'CreditoDia' && !clienteId && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1 animate-pulse">
                      * Seleccione un cliente para habilitar el crédito
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Agregar Producto</label>
                <select 
                  className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
                  onChange={(e) => e.target.value && agregarProducto(e.target.value)}
                  value=""
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => (
                    <option key={p.producto_id} value={p.producto_id}>
                      {p.nombre} (S/ {selectedCliente?.categoria === 'Externo' ? p.precio_externo : selectedCliente?.categoria === 'Especial' ? p.precio_especial : p.precio_snack})
                    </option>
                  ))}
                </select>
              </div>

              {/* Alertas de Validación */}
              {(missingStock.length > 0 || (formaPago === 'CreditoDia' && !clienteId)) && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                    <AlertTriangle size={18} />
                    <span>No se puede confirmar la venta:</span>
                  </div>
                  <ul className="text-xs text-rose-500 list-disc list-inside space-y-1 ml-2">
                    {formaPago === 'CreditoDia' && !clienteId && (
                      <li>El Crédito del Día requiere seleccionar un Cliente.</li>
                    )}
                    {missingStock.map((msg, idx) => <li key={idx}>{msg}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Detalle del Pedido</h4>
                <div className="space-y-2">
                  {detalles.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-800">{d.nombre}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(d.precio_unitario)} c/u</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          min="1" 
                          value={d.cantidad} 
                          onChange={(e) => actualizarCantidad(i, parseInt(e.target.value) || 1)}
                          className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <span className="font-bold text-slate-900 min-w-20 text-right">{formatCurrency(d.subtotal)}</span>
                        <button onClick={() => eliminarDetalle(i)} className="text-rose-500 p-1 hover:bg-rose-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {detalles.length === 0 && (
                    <p className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
                      No hay productos agregados
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total a Pagar</p>
                <p className="text-2xl font-black text-slate-900">
                  {formatCurrency(totalVenta)}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button 
                  onClick={handleSaveVenta} 
                  disabled={!canSave}
                  className={cn(
                    "px-8 py-3 text-white text-sm font-bold rounded-xl shadow-lg transition-all",
                    canSave 
                      ? "bg-orange-500 hover:bg-orange-600 shadow-orange-200" 
                      : "bg-slate-300 cursor-not-allowed shadow-none"
                  )}
                >
                  Confirmar Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ticket de Venta */}
      {showTicketModal && lastSale && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 text-center border-b border-slate-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">¡Venta Exitosa!</h3>
              <p className="text-slate-500">La transacción ha sido registrada.</p>
            </div>

            {/* Área del Ticket (Lo que se imprime) */}
            <div className="p-8 bg-slate-50" id="printable-ticket">
              <div className="bg-white p-6 shadow-sm border border-slate-200 font-mono text-xs text-slate-800 space-y-4">
                <div className="text-center space-y-1">
                  <p className="font-bold text-[9px] leading-tight">NO ES POR MI FUERZA, ES POR LA GRACIA DE DIOS.</p>
                  <h4 className="font-bold text-lg">CHIFONES ZUZÚ</h4>
                  <p>RUC: 10456789123</p>
                  <p>Calle Los Chifones 123 - Zuzu</p>
                </div>
                
                <div className="border-t border-dashed border-slate-300 pt-4 space-y-1">
                  <p>TICKET: #000{lastSale.ventaId}</p>
                  <p>FECHA: {lastSale.fecha}</p>
                  <p>CLIENTE: {lastSale.cliente}</p>
                  <p>PAGO: {lastSale.formaPago}</p>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-slate-200">
                        <th className="pb-1">CANT</th>
                        <th className="pb-1">DESC.</th>
                        <th className="pb-1 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="pt-2">
                      {lastSale?.detalles.map((d, i) => (
                        <tr key={i}>
                          <td className="py-1">{d.cantidad}</td>
                          <td className="py-1">
                            {d.nombre}
                            {d.cantidad >= 10 && (
                              <div className="text-[10px] text-slate-500 italic">+ 1 Regalo (10+1)</div>
                            )}
                          </td>
                          <td className="py-1 text-right">{formatCurrency(d.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-4 flex justify-between items-center text-sm font-bold">
                  <span>TOTAL</span>
                  <span className="text-lg">{formatCurrency(lastSale.total)}</span>
                </div>

                <div className="text-center pt-6 space-y-1 text-[10px]">
                  <p>¡Gracias por endulzar tu día con nosotros!</p>
                  <p>Síguenos en @chifoneszuzu</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white flex gap-3">
              <button 
                onClick={() => setShowTicketModal(false)} 
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  const printContent = document.getElementById('printable-ticket');
                  const windowPrint = window.open('', '', 'width=400,height=600');
                  if (windowPrint && printContent) {
                    windowPrint.document.write(`<html><head><title>Ticket</title><style>body{font-family:monospace;padding:20px;} table{width:100%;} .text-right{text-align:right;} .text-center{text-align:center;}</style></head><body>${printContent.innerHTML}</body></html>`);
                    windowPrint.document.close();
                    windowPrint.focus();
                    windowPrint.print();
                    windowPrint.close();
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Printer size={18} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
