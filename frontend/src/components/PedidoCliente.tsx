import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, CheckCircle, QrCode, Banknote, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../authcontext';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'sonner';

export default function PedidoCliente() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formaPago, setFormaPago] = useState('QR');
  const [procesando, setProcesando] = useState(false);
  const [orderFinalized, setOrderFinalized] = useState(false);

  useEffect(() => {
    fetch('/api/productos', {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    })
    .then(res => res.json())
    .then(data => {
      setProductos(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [user]);

  const agregarAlCarrito = (prod: any) => {
    const existe = carrito.find(item => item.producto_id === prod.producto_id);
    if (existe) {
      setCarrito(carrito.map(item => 
        item.producto_id === prod.producto_id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      // Para clientes, usamos el precio estándar o snack
      setCarrito([...carrito, { ...prod, cantidad: 1, precio_unitario: prod.precio_snack || prod.precio }]);
    }
    toast.success(`${prod.nombre} añadido`);
  };

  const total = useMemo(() => carrito.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0), [carrito]);

  const handleFinalizarPedido = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    
    const clienteId = user ? (user as any).cliente_id ?? null : null;

    const payload = {
      cliente_id: clienteId,
      total,
      forma_pago: formaPago,
      detalles: carrito.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario
      }))
    };

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${user?.token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setOrderFinalized(true);
        setCarrito([]);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al procesar pedido");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setProcesando(false);
    }
  };

  if (orderFinalized) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-800">¡Pedido Recibido!</h2>
        <p className="text-slate-500 max-w-sm">Estamos preparando tu dulce momento. Recibirás una notificación cuando tu chifón esté listo.</p>
        <button onClick={() => setOrderFinalized(false)} className="mt-4 px-8 py-3 bg-orange-500 text-white font-bold rounded-xl">Hacer otro pedido</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Nuestros Chifones</h2>
          <div className="p-2 bg-white rounded-lg border text-slate-500 flex items-center gap-2 text-sm">
             <Package size={16} /> {productos.length} Sabores disponibles
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {productos.map(p => (
              <div key={p.producto_id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-full h-32 bg-orange-50 rounded-xl mb-4 flex items-center justify-center text-orange-200">
                    <Package size={48} />
                  </div>
                  <h4 className="font-bold text-slate-800">{p.nombre}</h4>
                  <p className="text-xs text-slate-500">{p.sabor}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="font-black text-orange-600 text-lg">{formatCurrency(p.precio_snack || p.precio)}</span>
                  <button 
                    onClick={() => agregarAlCarrito(p)}
                    className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl h-fit sticky top-24">
        <div className="flex items-center gap-2 mb-6 text-slate-800">
          <ShoppingCart className="text-orange-500" />
          <h3 className="font-bold text-lg">Tu Carrito</h3>
        </div>

        <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
          {carrito.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-3">
              <div className="flex-1">
                <p className="font-bold text-slate-700">{item.nombre}</p>
                <p className="text-xs text-slate-400">{item.cantidad} x {formatCurrency(item.precio_unitario)}</p>
              </div>
              <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {carrito.length === 0 && <p className="text-center text-slate-400 text-sm py-4 italic">El carrito está vacío</p>}
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Método de Pago</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setFormaPago('QR')} className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all", formaPago === 'QR' ? "border-orange-500 bg-orange-50 text-orange-600" : "border-transparent bg-white")}>
                <QrCode size={20} /> <span className="text-[10px] font-bold">Yape / PLIN</span>
              </button>
              <button onClick={() => setFormaPago('Contado')} className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all", formaPago === 'Contado' ? "border-orange-500 bg-orange-50 text-orange-600" : "border-transparent bg-white")}>
                <Banknote size={20} /> <span className="text-[10px] font-bold">Efectivo</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-slate-500 font-bold text-sm">Total a pagar:</span>
            <span className="text-2xl font-black text-slate-900">{formatCurrency(total)}</span>
          </div>

          <button 
            disabled={carrito.length === 0 || procesando}
            onClick={handleFinalizarPedido}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {procesando ? <Loader2 className="animate-spin" /> : 'Confirmar Mi Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}