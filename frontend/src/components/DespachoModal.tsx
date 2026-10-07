import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  Calendar, 
  RefreshCw, 
  Truck, 
  Package, 
  MapPin, 
  DollarSign,
  Share2,
  FileText
} from 'lucide-react';
import { useAuth } from '../authcontext';
import { toast } from 'sonner';
import { DespachoData } from '../types';
import { formatCurrency, getLocalDateString, cn } from '../lib/utils';

interface DespachoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export default function DespachoModal({ isOpen, onClose, initialDate }: DespachoModalProps) {
  const { user } = useAuth();
  const [fecha, setFecha] = useState<string>(initialDate || getLocalDateString());
  const [data, setData] = useState<DespachoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensajeEditable, setMensajeEditable] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'detalle'>('whatsapp');

  useEffect(() => {
    if (initialDate) {
      setFecha(initialDate);
    }
  }, [initialDate]);

  const fetchDespacho = async (targetDate: string) => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/despacho?fecha=${targetDate}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error("Error al obtener la planilla de despacho");
      const json: DespachoData = await res.json();
      setData(json);
      setMensajeEditable(json.mensajeWhatsapp || '');
    } catch (err: any) {
      console.error(err);
      toast.error("No se pudo cargar el resumen de despacho");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDespacho(fecha);
    }
  }, [isOpen, fecha, user?.token]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mensajeEditable);
      setCopied(true);
      toast.success("Mensaje copiado al portapapeles", {
        description: "Listo para pegar en el grupo Familia ZUZÚ"
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error("Error al copiar texto");
    }
  };

  const handleSendWhatsApp = () => {
    if (!mensajeEditable) return;
    const encoded = encodeURIComponent(mensajeEditable);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleResetMessage = () => {
    if (data?.mensajeWhatsapp) {
      setMensajeEditable(data.mensajeWhatsapp);
      toast.info("Mensaje restablecido a la versión original");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
              <Truck size={26} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">Planilla de Despacho y Reparto</h3>
                <span className="px-2.5 py-0.5 bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 text-[11px] font-bold rounded-full">
                  Familia ZUZÚ
                </span>
              </div>
              <p className="text-emerald-100 text-xs mt-0.5">
                Resumen de destinos y preparación diaria para reparto por WhatsApp
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Filtro de Fecha y KPIs */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 shrink-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Calendar size={16} className="text-emerald-600" />
              <label className="text-xs font-bold text-slate-500 uppercase">Fecha:</label>
              <input 
                type="date" 
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent border-none text-xs font-black text-slate-800 outline-none cursor-pointer"
              />
              <button 
                onClick={() => fetchDespacho(fecha)} 
                title="Recargar datos"
                className="ml-1 p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <RefreshCw size={14} className={cn(loading && "animate-spin text-emerald-600")} />
              </button>
            </div>

            {/* Pestañas de Vista */}
            <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                  activeTab === 'whatsapp' 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Share2 size={13} className="text-emerald-600" />
                Mensaje WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('detalle')}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all",
                  activeTab === 'detalle' 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Package size={13} className="text-orange-500" />
                Desglose por Sabores
              </button>
            </div>
          </div>

          {/* Tarjetas Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Venta</p>
              <p className="text-lg font-black text-slate-800">
                {formatCurrency(data?.totalVentas || 0)}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Chifones</p>
              <p className="text-lg font-black text-orange-600">
                {data?.totalUnidades || 0} <span className="text-xs font-medium text-slate-400">unid</span>
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inv. 70%</p>
              <p className="text-lg font-black text-emerald-600">
                {formatCurrency(data?.inversion70 || 0)}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Casa 30%</p>
              <p className="text-lg font-black text-blue-600">
                {formatCurrency(data?.casa30 || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido Central */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
              <p className="text-sm font-medium text-slate-500">Cargando ventas y calculando despacho...</p>
            </div>
          ) : !data || data.totalVentas === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Truck size={36} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No se encontraron ventas para esta fecha</p>
              <p className="text-xs text-slate-400 mt-1">Registra las ventas del día para generar automáticamente la planilla de despacho.</p>
            </div>
          ) : activeTab === 'whatsapp' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-600" />
                  Mensaje generado para WhatsApp:
                </span>
                <button
                  type="button"
                  onClick={handleResetMessage}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Restablecer original
                </button>
              </div>

              {/* Área de texto formateada con estilo WhatsApp */}
              <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50/20 p-1 shadow-inner focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                <textarea
                  rows={14}
                  value={mensajeEditable}
                  onChange={(e) => setMensajeEditable(e.target.value)}
                  className="w-full p-4 bg-white rounded-xl text-xs md:text-sm font-mono text-slate-800 leading-relaxed outline-none resize-none border-none"
                  placeholder="Aquí aparecerá el mensaje de despacho..."
                />
              </div>
              <p className="text-[11px] text-slate-400 italic">
                💡 Puedes editar cualquier dato directamente en el cuadro de texto antes de enviarlo.
              </p>
            </div>
          ) : (
            /* Tab de Desglose de Producción y Destinos */
            <div className="space-y-5">
              <p className="text-xs text-slate-500">
                Lista de clientes y detalle de sabores de chifón asignados a cada ruta de entrega:
              </p>

              {data.zonas.map((zona) => (
                <div key={zona.zona} className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-600" />
                      <h4 className="text-sm font-black text-slate-800 tracking-wider uppercase">{zona.zona}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-orange-600 bg-orange-100/60 px-2 py-0.5 rounded-full">
                        {zona.totalUnidades} chifones
                      </span>
                      <span className="text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        {formatCurrency(zona.totalMonto)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 divide-y divide-slate-100 space-y-3">
                    {zona.pedidos.map((ped, idx) => (
                      <div key={idx} className={cn("pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2")}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">
                              {ped.total_unidades}
                            </span>
                            <span className="text-sm font-bold text-slate-800">{ped.cliente_nombre}</span>
                            {ped.direccion && (
                              <span className="text-[11px] text-slate-400 truncate max-w-xs">
                                ({ped.direccion})
                              </span>
                            )}
                          </div>
                          {/* Sabores específicos */}
                          <div className="flex flex-wrap gap-1.5 mt-1.5 ml-8">
                            {ped.detalles.map((det, dIdx) => (
                              <span key={dIdx} className="text-[11px] font-medium bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                {det.cantidad}x {det.producto_nombre}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-8 sm:ml-0">
                          <span className="text-sm font-black text-slate-800">
                            {formatCurrency(ped.total_monto)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!mensajeEditable}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all",
                copied 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
              )}
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? "¡Copiado!" : "Copiar Mensaje"}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!mensajeEditable}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all cursor-pointer"
            >
              <Send size={16} />
              Enviar a WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
