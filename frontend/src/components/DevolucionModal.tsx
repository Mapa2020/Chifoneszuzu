import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Box, Check, AlertTriangle, Calendar, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { getLocalDateString } from '../lib/utils';
import { useAuth } from '../authcontext';

interface DevolucionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedClienteId?: number | null;
  clientes: any[];
}

export default function DevolucionModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedClienteId,
  clientes
}: DevolucionModalProps) {
  const { user } = useAuth();
  const [clienteId, setClienteId] = useState<string>(preselectedClienteId ? String(preselectedClienteId) : '');
  const [fecha, setFecha] = useState<string>(getLocalDateString());
  const [cantidad, setCantidad] = useState<number>(1);
  const [condicion, setCondicion] = useState<'Sano' | 'Danado'>('Sano');
  const [observaciones, setObservaciones] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedClienteId) {
      setClienteId(String(preselectedClienteId));
    } else if (clientes.length > 0 && !clienteId) {
      // Por defecto seleccionar el cliente con más envases pendientes
      const topPendiente = [...clientes].sort((a, b) => (b.pendientes_actual || 0) - (a.pendientes_actual || 0))[0];
      if (topPendiente) setClienteId(String(topPendiente.cliente_id));
    }
  }, [preselectedClienteId, clientes, isOpen]);

  if (!isOpen) return null;

  const selectedCliente = clientes.find(c => String(c.cliente_id) === String(clienteId));
  const pendientes = selectedCliente ? Number(selectedCliente.pendientes_actual || 0) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      toast.error("Selecciona un cliente de categoría Snack");
      return;
    }
    if (cantidad <= 0) {
      toast.error("La cantidad de envases debe ser mayor a 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contenedores/devolucion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          cliente_id: parseInt(clienteId, 10),
          fecha,
          cantidad,
          condicion,
          observaciones
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la devolución");

      toast.success("Devolución Registrada", {
        description: `Se registraron ${cantidad} envase(s) para ${selectedCliente?.nombre || 'el cliente'}.`
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <RotateCcw size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Registro Diario de Envases</h3>
              <p className="text-xs text-orange-100 font-medium">Recepción y control físico tras reparto</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Selector de Cliente */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" /> Cliente Snack
            </label>
            <select
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                const cl = clientes.find(c => String(c.cliente_id) === e.target.value);
                if (cl && cl.pendientes_actual > 0) {
                  setCantidad(Math.min(cl.pendientes_actual, 2));
                }
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="">Selecciona un cliente...</option>
              {clientes.map(c => (
                <option key={c.cliente_id} value={c.cliente_id}>
                  {c.nombre} ({c.pendientes_actual || 0} pendientes) — {c.zona || 'Sin Zona'}
                </option>
              ))}
            </select>

            {/* Resumen del cliente seleccionado */}
            {selectedCliente && (
              <div className="mt-2.5 p-3 rounded-xl bg-orange-50/70 border border-orange-100 flex items-center justify-between text-xs">
                <span className="text-orange-950 font-medium">
                  Envases en su poder: <strong className="text-orange-700">{pendientes} envase(s)</strong>
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-black bg-white text-orange-600 border border-orange-200 text-[11px]">
                  Cartilla {selectedCliente.tipo_cartilla || 'Activo'}
                </span>
              </div>
            )}
          </div>

          {/* Fecha de Devolución */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" /> Fecha Retorno
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
              />
            </div>

            {/* Cantidad con botones rápidos */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <Box size={14} className="text-slate-400" /> Cantidad Devuelta
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg transition-colors flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setCantidad(cantidad + 1)}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg transition-colors flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Botones de sugerencia rápida */}
          {pendientes > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Sugerir:</span>
              <button
                type="button"
                onClick={() => setCantidad(1)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                1 envase
              </button>
              {pendientes >= 2 && (
                <button
                  type="button"
                  onClick={() => setCantidad(2)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  2 envases
                </button>
              )}
              {pendientes > 2 && (
                <button
                  type="button"
                  onClick={() => setCantidad(pendientes)}
                  className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-black transition-colors cursor-pointer"
                >
                  Todos ({pendientes})
                </button>
              )}
            </div>
          )}

          {/* Condición Física del Envase */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Inspección Visual del Envase
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCondicion('Sano')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  condicion === 'Sano'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm ring-2 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Check size={16} className={condicion === 'Sano' ? 'text-emerald-600' : 'text-slate-400'} />
                Sano / Reutilizable
              </button>

              <button
                type="button"
                onClick={() => setCondicion('Danado')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  condicion === 'Danado'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm ring-2 ring-rose-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle size={16} className={condicion === 'Danado' ? 'text-rose-600' : 'text-slate-400'} />
                Con Falla / Dar de Baja
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 italic">
              {condicion === 'Sano' 
                ? 'Incrementa el ciclo de reutilización del envase y marca la casilla en la cartilla.'
                : 'Registra el envase como baja física/desecho sin culpar al ciclo del cliente.'}
            </p>
          </div>

          {/* Observaciones opcionales */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Observaciones (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Devolvió envase limpio del pedido anterior"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Registrando..." : "Confirmar Devolución"}
              <ArrowRight size={16} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
