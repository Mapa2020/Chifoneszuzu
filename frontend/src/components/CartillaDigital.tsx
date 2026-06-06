import { useState, useEffect } from 'react';
import { Calendar, Package, RotateCcw, Award, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../authcontext';

interface CartillaProps {
  clienteId: number;
  onBack: () => void;
}

export default function CartillaDigital({ clienteId, onBack }: CartillaProps) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contenedores/cartilla/${clienteId}`, {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    })
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      });
  }, [clienteId]);

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-400">Cargando cartilla...</div>;

  const { cliente, ventas, devoluciones, promocion } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">
        <ArrowLeft size={18} /> Volver a Contenedores
      </button>

      {/* Cabecera del Cliente */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-orange-400 font-black uppercase tracking-widest text-xs mb-2">Cartilla de Fidelidad Snack</p>
          <h2 className="text-3xl font-black mb-1">{cliente.nombre}</h2>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <Package size={14} /> Cliente ID: #{cliente.cliente_id} | Categoría: {cliente.categoria}
          </p>
        </div>
        <Award className="absolute -right-5 -top-5 text-white/5" size={200} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Visual de la Cartilla (Los 10 slots) */}
        <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-800 text-lg uppercase">Progreso de Ventas</h3>
            <span className="px-4 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-black">
              {promocion.totalVentas} / 10 COMPLETADOS
            </span>
          </div>
          
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[...Array(10)].map((_, i) => {
              const isCompleted = i < promocion.totalVentas;
              return (
                <div key={i} className={cn(
                  "aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                  isCompleted ? "bg-orange-500 border-orange-500 shadow-lg shadow-orange-200" : "bg-slate-50 border-dashed border-slate-200"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="text-white" size={24} />
                  ) : (
                    <span className="text-slate-300 font-black text-xl">{i + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Requisito de las 3 Semanas */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h4 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" />
              Reto: Mínimo 3 ventas semanales por 3 semanas
            </h4>
            <div className="flex gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className={cn(
                    "h-2 rounded-full mb-2",
                    i < promocion.totalSemanasExitosas ? "bg-emerald-500" : "bg-slate-200"
                  )} />
                  <p className="text-[10px] font-black text-slate-400 uppercase">Semana {i + 1}</p>
                </div>
              ))}
            </div>
            {promocion.aplicaRegalo ? (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-center font-black text-xs animate-bounce">
                ¡PROMOCIÓN CUMPLIDA! EL CLIENTE TIENE 1 CHIFÓN DE REGALO
              </div>
            ) : (
              <p className="mt-4 text-[10px] text-slate-500 italic text-center">
                Faltan {Math.max(0, 3 - promocion.totalSemanasExitosas)} semanas cumpliendo el mínimo de ventas.
              </p>
            )}
          </div>
        </div>

        {/* Reporte de Movimientos (Fechas) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-full">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-orange-500" />
              Últimos Movimientos
            </h3>
            <div className="space-y-4 max-h-125 overflow-y-auto pr-2">
              {/* Ventas */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ventas (Entregas)</p>
                {ventas.slice(0, 5).map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-700">{new Date(v.fecha).toLocaleDateString()}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">Ticket #{v.venta_id}</span>
                  </div>
                ))}
              </div>

              {/* Devoluciones */}
              <div className="mt-6">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Devoluciones Envases</p>
                {devoluciones.length > 0 ? (
                  devoluciones.slice(0, 5).map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-700">{new Date(d.fecha).toLocaleDateString()}</span>
                      <RotateCcw size={12} className="text-emerald-500" />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Sin devoluciones registradas.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Nota de Regalo */}
      {promocion.aplicaRegalo && (
        <div className="bg-orange-500 p-6 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-orange-200">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl"><Award size={32} /></div>
            <div>
              <h4 className="text-xl font-black">¡Premio Listo!</h4>
              <p className="text-orange-100 text-sm">Este cliente ha cumplido con el volumen de ventas y constancia semanal.</p>
            </div>
          </div>
          <div className="text-3xl font-black bg-white text-orange-600 px-6 py-2 rounded-2xl">10+1</div>
        </div>
      )}
    </div>
  );
}