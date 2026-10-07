import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  Copy, 
  Share2, 
  Edit3, 
  Award, 
  Check, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatDateShort, getLocalDateString } from '../lib/utils';
import { useAuth } from '../authcontext';

interface CartillaVisualProps {
  clienteId: number;
  onRefreshParent?: () => void;
}

export default function CartillaVisual({ clienteId, onRefreshParent }: CartillaVisualProps) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Estados de edición de metadatos
  const [numeroCartilla, setNumeroCartilla] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [notas, setNotas] = useState('');
  const [tipoCartilla, setTipoCartilla] = useState<'Activo' | 'Preferente'>('Activo');

  // Estados de edición de slot
  const [slotSabor, setSlotSabor] = useState('');
  const [slotFechaVenta, setSlotFechaVenta] = useState('');
  const [slotEnvaseDevuelto, setSlotEnvaseDevuelto] = useState(false);
  const [slotFechaDevolucion, setSlotFechaDevolucion] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchCartilla = async () => {
    if (!clienteId || !user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contenedores/cartilla/${clienteId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error("No se pudo cargar la cartilla");
      const json = await res.json();
      setData(json);
      setNumeroCartilla(json.cartilla.numero_cartilla || '');
      setFechaVencimiento(json.cartilla.fecha_vencimiento ? json.cartilla.fecha_vencimiento.split('T')[0] : '');
      setNotas(json.cartilla.notas || '');
      setTipoCartilla(json.cartilla.tipo || 'Activo');
    } catch (err: any) {
      toast.error("Error al cargar cartilla", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartilla();
  }, [clienteId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-slate-500 text-sm font-medium">Generando cartilla visual en tiempo real...</p>
      </div>
    );
  }

  if (!data || !data.cartilla) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
        <AlertCircle size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-bold">No se encontró información de cartilla para este cliente</p>
      </div>
    );
  }

  const { cliente, cartilla, slots = [], balance } = data;
  const isPreferente = (cartilla.tipo || tipoCartilla) === 'Preferente';

  // Chifones y envases completados
  const chifonesCount = slots.filter((s: any) => s.fecha_venta !== null).length;
  const devueltosCount = slots.filter((s: any) => s.envase_devuelto === 1).length;
  const isCompleta = chifonesCount >= 10 && devueltosCount >= 10;

  // Formato para mostrar fecha de venta en círculo: "✓ 24/8"
  const formatSlotSaleDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `✓ ${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`;
    }
    return `✓ ${clean}`;
  };

  // Formato para mostrar fecha de retorno en casilla superior: "✓ 26"
  const formatSlotReturnDate = (dateStr: string | null) => {
    if (!dateStr) return '✓';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `✓ ${parseInt(parts[2], 10)}`;
    }
    return '✓';
  };

  // Toggle rápido de retorno en una casilla
  const handleToggleReturn = async (slot: any) => {
    if (!user?.token) return;
    const nuevoEstado = slot.envase_devuelto === 1 ? 0 : 1;
    const nuevaFecha = nuevoEstado === 1 ? (slot.fecha_devolucion || getLocalDateString()) : null;

    try {
      const res = await fetch(`/api/contenedores/cartilla/${cartilla.cartilla_id}/slot/${slot.slot_numero}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          fecha_venta: slot.fecha_venta ? slot.fecha_venta.split('T')[0] : null,
          sabor_abrev: slot.sabor_abrev,
          fecha_devolucion: nuevaFecha,
          envase_devuelto: nuevoEstado === 1,
          observaciones: slot.observaciones
        })
      });

      if (res.ok) {
        toast.success(nuevoEstado === 1 ? "Envase marcado como devuelto" : "Envase marcado como pendiente");
        fetchCartilla();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (error) {
      toast.error("Error al actualizar casilla");
    }
  };

  // Abrir modal de edición de slot
  const openEditSlot = (slot: any) => {
    setEditingSlot(slot);
    setSlotSabor(slot.sabor_abrev || 'CHC');
    setSlotFechaVenta(slot.fecha_venta ? slot.fecha_venta.split('T')[0] : getLocalDateString());
    setSlotEnvaseDevuelto(slot.envase_devuelto === 1);
    setSlotFechaDevolucion(slot.fecha_devolucion ? slot.fecha_devolucion.split('T')[0] : getLocalDateString());
  };

  const handleSaveSlot = async () => {
    if (!editingSlot || !user?.token) return;
    try {
      const res = await fetch(`/api/contenedores/cartilla/${cartilla.cartilla_id}/slot/${editingSlot.slot_numero}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          fecha_venta: slotFechaVenta || null,
          sabor_abrev: slotSabor,
          fecha_devolucion: slotEnvaseDevuelto ? slotFechaDevolucion : null,
          envase_devuelto: slotEnvaseDevuelto,
          observaciones: editingSlot.observaciones
        })
      });

      if (res.ok) {
        toast.success(`Casilla #${editingSlot.slot_numero} actualizada`);
        setEditingSlot(null);
        fetchCartilla();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      toast.error("Error al guardar casilla");
    }
  };

  // Guardar metadatos (vencimiento, notas, correlativo)
  const handleSaveMeta = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`/api/contenedores/cartilla/${cartilla.cartilla_id}/meta`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          numero_cartilla: numeroCartilla,
          fecha_vencimiento: fechaVencimiento,
          notas: notas,
          tipo: tipoCartilla
        })
      });

      if (res.ok) {
        toast.success("Datos de cartilla actualizados");
        setEditingMeta(false);
        fetchCartilla();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      toast.error("Error al guardar metadatos");
    }
  };

  // Canjear chifón gratis
  const handleCanjear = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`/api/contenedores/cartilla/${cartilla.cartilla_id}/canjear`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const resData = await res.json();
      if (res.ok) {
        toast.success("¡Premio Canjeado con Éxito!", {
          description: "Se entregó el chifón gratis y se generó una nueva cartilla para el cliente."
        });
        fetchCartilla();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      toast.error("Error al canjear premio");
    }
  };

  // Cambiar tipo entre Activo y Preferente
  const handleToggleTipoCliente = async () => {
    if (!user?.token) return;
    const nuevoTipo = isPreferente ? 'Activo' : 'Preferente';
    try {
      const res = await fetch(`/api/contenedores/cliente/${cliente.cliente_id}/tipo-cartilla`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ tipo: nuevoTipo })
      });
      if (res.ok) {
        toast.success(`Cliente actualizado a "${nuevoTipo}"`);
        fetchCartilla();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      toast.error("No se pudo cambiar el tipo de cliente");
    }
  };

  // DIBUJAR CARTILLA EN CANVAS DE ALTA RESOLUCIÓN (1200 x 675 - Relación 16:9)
  const drawCardOnCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 1200;
    canvas.height = 675;

    // 1. Fondo de la Cartilla
    if (isPreferente) {
      // Rosa cálido auténtico de la foto
      ctx.fillStyle = '#f7b2d5';
      ctx.fillRect(0, 0, 1200, 675);
    } else {
      // Crema marfil cálido de la foto
      ctx.fillStyle = '#fdf8ee';
      ctx.fillRect(0, 0, 1200, 675);
    }

    // 2. Cargar imagen de la mascota
    const loadMascot = (): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/images/mascota_zuzu.png';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      });
    };
    const mascotImg = await loadMascot();

    // 3. Encabezados
    // Subtítulo pequeño: CHIFONES ZUZÚ
    ctx.textAlign = 'center';
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 26px "Montserrat", sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('CHIFONES ZUZÚ', 600, 75);
    ctx.letterSpacing = '0px';

    // Título Principal
    if (isPreferente) {
      ctx.fillStyle = '#d63438';
      ctx.font = '900 48px "Arial Black", "Arial", sans-serif';
      ctx.fillText('CLIENTE PREFERENTE', 600, 130);

      // Fecha de Vencimiento y notas (Arriba izquierda)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px sans-serif';
      const venceStr = fechaVencimiento ? formatDateShort(fechaVencimiento) : '30/9/26';
      ctx.fillText(`Vence: ${venceStr}`, 45, 65);

      if (notas) {
        ctx.fillStyle = '#1d4ed8';
        ctx.font = 'italic 18px "Comic Sans MS", cursive, sans-serif';
        ctx.fillText(notas, 45, 95);
      }
    } else {
      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 50px "Arial Black", "Arial", sans-serif';
      ctx.fillText('CLIENTE ACTIVO', 630, 135);

      // Banner CHIFON GRATIS (Arriba izquierda)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 32px "Arial Black", sans-serif';
      ctx.fillText('CHIFON GRATIS', 50, 140);

      // Fecha Vencimiento
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 20px sans-serif';
      const venceStr = fechaVencimiento ? formatDateShort(fechaVencimiento) : '/ /';
      ctx.fillText(`Vence:  ${venceStr}`, 50, 480);
    }

    // Nombre del Cliente (Arriba Derecha)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Nombre:', 1020, 70);

    ctx.font = 'bold 32px "Comic Sans MS", "Caveat", cursive, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(cliente.nombre || 'Cliente', 1140, 110);

    // Correlativo (Esquina Inferior Derecha)
    ctx.font = 'bold 50px "Comic Sans MS", "Caveat", cursive, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(numeroCartilla || '19/26', 1140, 600);

    // 4. Renderizar los 10 Slots (2 Filas de 5)
    // Coordenadas calculadas para coincidir exactamente con la plantilla de la foto
    const startX = isPreferente ? 200 : 340;
    const startY = 190;
    const gapX = 175;
    const gapY = 160;
    const radius = 55;

    for (let i = 0; i < 10; i++) {
      const slot = slots[i] || { slot_numero: i + 1 };
      const col = i % 5;
      const row = Math.floor(i / 5);
      const cx = startX + col * gapX;
      const cy = startY + row * gapY + 50;

      // A. Casilla de Retorno (Checkbox cuadrada encima del círculo)
      const boxSize = 34;
      const boxX = cx - boxSize / 2;
      const boxY = cy - radius - 38;

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isPreferente ? '#d946ef' : '#ef4444';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(boxX, boxY, boxSize, boxSize);
      ctx.strokeRect(boxX, boxY, boxSize, boxSize);

      if (slot.envase_devuelto === 1) {
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px "Comic Sans MS", cursive, sans-serif';
        const retDay = formatSlotReturnDate(slot.fecha_devolucion);
        ctx.fillText(retDay, cx, boxY + 25);
      }

      // B. Círculo del Chifón
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isPreferente ? '#fef3e2' : '#f9a8d4';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isPreferente ? '#fcd34d' : '#f472b6';
      ctx.stroke();

      // C. Marca de agua de la Mascota Zuzú
      if (mascotImg) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.drawImage(mascotImg, cx - 40, cy - 40, 80, 80);
        ctx.restore();
      }

      // D. Texto del Sabor y Fecha de Venta
      if (slot.fecha_venta) {
        // Abreviatura del Sabor en el centro
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e1b4b';
        ctx.font = '900 24px "Comic Sans MS", sans-serif';
        ctx.fillText(slot.sabor_abrev || 'CHC', cx, cy - 5);

        // Marca de verificación diagonal y fecha
        ctx.fillStyle = '#09090b';
        ctx.font = 'bold 20px "Comic Sans MS", cursive, sans-serif';
        const saleStr = formatSlotSaleDate(slot.fecha_venta);
        ctx.fillText(saleStr, cx + 10, cy + 35);

        // Trazo diagonal simulando tachado a mano
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 35, cy + 25);
        ctx.lineTo(cx + 35, cy - 25);
        ctx.stroke();
      }
    }

    // 5. Ilustración del Chifón para Cliente Activo (Lado izquierdo)
    if (!isPreferente) {
      const cakeX = 80;
      const cakeY = 220;
      
      // Dibujamos un delicioso chifón dorado
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(cakeX + 90, cakeY + 120, 90, 50, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cuerpo del chifón
      const gradient = ctx.createLinearGradient(cakeX, cakeY, cakeX + 180, cakeY + 140);
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(0.5, '#fbbf24');
      gradient.addColorStop(1, '#d97706');
      ctx.fillStyle = gradient;
      ctx.fillRect(cakeX, cakeY + 30, 180, 90);

      // Parte superior con orificio de chifón
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.ellipse(cakeX + 90, cakeY + 30, 90, 45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Orificio central
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(cakeX + 90, cakeY + 30, 30, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Azúcar glas decorativo
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 25; s++) {
        const sx = cakeX + 25 + Math.random() * 130;
        const sy = cakeY + 15 + Math.random() * 25;
        ctx.fillRect(sx, sy, 3, 3);
      }
      ctx.restore();
    }

    // 6. Texto de Reglas al Pie (Centro inferior)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e293b';

    if (isPreferente) {
      ctx.font = '500 24px sans-serif';
      ctx.fillText('Al completar 10 chifones en 5 semanas,', 600, 570);
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('mantienes tu precio por mayor en cada compra.', 600, 605);
    } else {
      ctx.font = '500 24px sans-serif';
      ctx.fillText('Válido solo si se cumple la compra de 3 chifones por semana,', 630, 575);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('durante 3 semanas consecutivas (10 chifones en total).', 630, 610);
    }

    return canvas;
  };

  // Descargar la cartilla en imagen PNG HD
  const handleDownloadImage = async () => {
    setExporting(true);
    try {
      const canvas = await drawCardOnCanvas();
      if (!canvas) throw new Error("No se pudo renderizar la cartilla");

      const link = document.createElement('a');
      const cleanName = (cliente.nombre || 'Cliente').replace(/\s+/g, '_');
      link.download = `Cartilla_${cartilla.tipo}_${cleanName}_${cartilla.numero_cartilla.replace('/', '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success("Cartilla Descargada en Alta Resolución (PNG)");
    } catch (err: any) {
      toast.error("Error al descargar cartilla", { description: err.message });
    } finally {
      setExporting(false);
    }
  };

  // Copiar imagen PNG al portapapeles para pegar directo en WhatsApp
  const handleCopyImage = async () => {
    setExporting(true);
    try {
      const canvas = await drawCardOnCanvas();
      if (!canvas) throw new Error("No se pudo renderizar la cartilla");

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Error generando archivo de imagen");
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success("¡Imagen Copiada al Portapapeles!", {
            description: "Abre WhatsApp Web y presiona Ctrl + V para pegarla de inmediato."
          });
        } catch (clipErr) {
          // Si el navegador bloquea el clipboard de imágenes, descargamos automáticamente
          handleDownloadImage();
        }
      }, 'image/png');
    } catch (err: any) {
      toast.error("Error al copiar imagen", { description: err.message });
    } finally {
      setExporting(false);
    }
  };

  // Enviar mensaje de texto con resumen al WhatsApp del cliente
  const handleSendWhatsApp = () => {
    let msg = `*🍰 CHIFONES ZUZÚ - CONTROL DE CARTILLA* %0A`;
    msg += `Hola *${cliente.nombre}*, aquí tienes el avance de tu cartilla:%0A`;
    msg += `------------------------------------%0A`;
    msg += `📋 *Tipo de Cartilla:* ${cartilla.tipo}%0A`;
    msg += `🔢 *N° Cartilla:* ${cartilla.numero_cartilla}%0A`;
    msg += `🧁 *Chifones Comprados:* ${chifonesCount} / 10%0A`;
    msg += `📦 *Envases Devueltos:* ${devueltosCount} / 10%0A`;
    msg += `📅 *Vencimiento:* ${fechaVencimiento || 'Próximamente'}%0A`;
    msg += `------------------------------------%0A`;
    if (isCompleta && !isPreferente) {
      msg += `🎉 *¡FELICIDADES! Has completado tu cartilla y tienes 1 CHIFÓN GRATIS listo para canjear en tu próximo pedido.* 🎁%0A`;
    } else if (isPreferente) {
      msg += `✨ *Mantienes tu precio mayorista completando los envases devueltos.*%0A`;
    } else {
      msg += `¡Sigue acumulando tus chifones para ganar tu chifón gratis! Recuerda devolver los envases en cada entrega.%0A`;
    }

    const phone = cliente.telefono ? cliente.telefono.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/591${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">

      {/* Canvas oculto para exportación de imágenes HD */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Barra Superior con Controles y Acciones */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-black text-slate-800">{cliente.nombre}</h3>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
              isPreferente ? "bg-pink-100 text-pink-700 border border-pink-200" : "bg-amber-100 text-amber-700 border border-amber-200"
            )}>
              Cartilla {cartilla.tipo}
            </span>
            <span className="text-xs font-bold text-slate-400">
              #{cartilla.numero_cartilla}
            </span>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-3">
            <span>Zona: <strong>{cliente.zona || 'UAGRM'}</strong></span>
            <span>•</span>
            <span>Envases en poder del cliente: <strong className="text-orange-600">{balance.pendientes} pendientes</strong></span>
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyImage}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-200 transition-all cursor-pointer"
            title="Copiar imagen para pegar directamente en WhatsApp"
          >
            <Copy size={16} />
            Copiar Imagen
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md shadow-slate-200 transition-all cursor-pointer"
            title="Descargar cartilla en formato PNG"
          >
            <Download size={16} />
            Descargar PNG
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all cursor-pointer"
            title="Enviar mensaje de texto a WhatsApp"
          >
            <Share2 size={16} />
            WhatsApp
          </button>

          <button
            onClick={() => setEditingMeta(true)}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Editar datos de cartilla"
          >
            <Edit3 size={16} />
          </button>

          <button
            onClick={handleToggleTipoCliente}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title={`Cambiar a ${isPreferente ? 'Cliente Activo' : 'Cliente Preferente'}`}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Banner de Felicitación / Canje si completó 10/10 */}
      {isCompleta && !isPreferente && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Award size={36} className="text-white" />
            </div>
            <div>
              <h4 className="text-xl font-black">¡10 Chifones y 10 Envases Completados!</h4>
              <p className="text-emerald-100 text-sm">Este cliente ha ganado su **Chifón Gratis**.</p>
            </div>
          </div>
          <button
            onClick={handleCanjear}
            className="px-6 py-3 bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl font-black text-sm shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            Canjear Chifón y Nueva Cartilla
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TARJETA VISUAL INTERACTIVA (Renders with 100% fidelity to the physical photos) */}
      {/* ========================================================================= */}
      <div 
        className={cn(
          "w-full rounded-3xl p-6 sm:p-10 shadow-xl border relative overflow-hidden transition-all select-none",
          isPreferente 
            ? "bg-[#f8b4d9] border-[#f497c5] text-slate-900" 
            : "bg-[#fdf8ee] border-[#f3ead7] text-slate-900"
        )}
        style={{ minHeight: '520px' }}
      >
        {/* Cabecera de la Cartilla */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 relative z-10">
          
          {/* Lado Izquierdo: Vencimiento y Notas */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold">
              <span>Vence:</span>
              <span className="underline decoration-2 decoration-slate-400">
                {fechaVencimiento ? formatDateShort(fechaVencimiento) : '30/9/26'}
              </span>
            </div>
            {notas && (
              <p className="text-xs sm:text-sm font-semibold italic text-blue-800 font-serif">
                {notas}
              </p>
            )}

            {!isPreferente && (
              <div className="pt-2">
                <span className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
                  CHIFON GRATIS
                </span>
              </div>
            )}
          </div>

          {/* Centro: Título de la Empresa y Tipo de Cartilla */}
          <div className="text-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:top-6 w-full sm:w-auto">
            <h4 className="text-xs sm:text-sm font-bold tracking-[0.25em] text-slate-800 uppercase mb-0.5">
              CHIFONES ZUZÚ
            </h4>
            <h2 className={cn(
              "text-2xl sm:text-4xl font-black tracking-tight",
              isPreferente ? "text-[#d63438]" : "text-[#b91c1c]"
            )}>
              {isPreferente ? "CLIENTE PREFERENTE" : "CLIENTE ACTIVO"}
            </h2>
          </div>

          {/* Lado Derecho: Nombre y Correlativo */}
          <div className="text-right">
            <p className="text-xs font-bold text-slate-600">Nombre:</p>
            <p className="text-lg sm:text-2xl font-black font-serif italic text-slate-900 underline decoration-slate-400">
              {cliente.nombre}
            </p>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* GRID DE 10 SLOTS (2 filas de 5 casillas) */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-8 gap-x-4 my-8 max-w-4xl mx-auto relative z-10">
          {slots.map((slot: any) => {
            const isSold = slot.fecha_venta !== null;
            const isReturned = slot.envase_devuelto === 1;

            return (
              <div key={slot.slot_numero} className="flex flex-col items-center">
                
                {/* Casilla Checkbox de Retorno del Envase (Cuadrado encima del círculo) */}
                <button
                  type="button"
                  onClick={() => handleToggleReturn(slot)}
                  className={cn(
                    "w-9 h-9 rounded-lg border-2 flex items-center justify-center mb-2.5 transition-all cursor-pointer font-serif font-black text-sm",
                    isReturned
                      ? isPreferente
                        ? "bg-white border-[#d946ef] text-slate-900 shadow-sm"
                        : "bg-white border-red-500 text-slate-900 shadow-sm"
                      : isPreferente
                        ? "bg-white/80 border-[#d946ef]/60 hover:bg-white text-transparent"
                        : "bg-white/80 border-red-400/60 hover:bg-white text-transparent"
                  )}
                  title={isReturned ? "Envase devuelto (Clic para desmarcar)" : "Envase pendiente (Clic para marcar devuelto)"}
                >
                  {isReturned ? formatSlotReturnDate(slot.fecha_devolucion) : ""}
                </button>

                {/* Círculo del Chifón (Mascota + Sabor + Fecha de Venta) */}
                <div
                  onClick={() => openEditSlot(slot)}
                  className={cn(
                    "w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center relative border-2 transition-all cursor-pointer overflow-hidden shadow-sm group hover:scale-105",
                    isSold
                      ? isPreferente
                        ? "bg-[#fef3e2] border-[#fcd34d]"
                        : "bg-[#f9a8d4] border-[#f472b6]"
                      : "bg-white/40 border-dashed border-slate-300 hover:bg-white/60"
                  )}
                  title={`Casilla #${slot.slot_numero} (Clic para editar sabor o fecha)`}
                >
                  {/* Marca de agua de la Mascota Zuzú */}
                  <img
                    src="/images/mascota_zuzu.png"
                    alt="Zuzú"
                    className="absolute inset-0 w-full h-full object-contain opacity-25 pointer-events-none p-2"
                  />

                  {isSold ? (
                    <div className="relative z-10 text-center w-full px-1">
                      {/* Abreviatura del Sabor */}
                      <span className="block font-black text-base sm:text-xl font-serif text-slate-900 tracking-tight leading-tight">
                        {slot.sabor_abrev || 'CHC'}
                      </span>

                      {/* Fecha de Venta con checkmark tachado */}
                      <span className="block text-xs sm:text-sm font-bold font-serif text-slate-800 mt-1">
                        {formatSlotSaleDate(slot.fecha_venta)}
                      </span>

                      {/* Línea diagonal de tachado estilo firma */}
                      <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-slate-800 rotate-[-30deg] pointer-events-none opacity-80" />
                    </div>
                  ) : (
                    <span className="text-slate-400 font-bold text-xs relative z-10">
                      #{slot.slot_numero}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* ===================================================================== */}
        {/* Pie de la Cartilla: Reglas Oficiales y Correlativo */}
        {/* ===================================================================== */}
        <div className="mt-8 pt-4 border-t border-slate-800/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left relative z-10">
          
          {/* Logo Espiral decorativo a la izquierda */}
          <div className="hidden sm:flex items-center gap-2 opacity-60">
            <div className="w-6 h-6 rounded-full border-2 border-slate-800 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>
          </div>

          {/* Texto de las Reglas */}
          <div className="text-xs sm:text-sm text-slate-800 max-w-xl mx-auto text-center font-medium leading-relaxed">
            {isPreferente ? (
              <p>
                Al completar 10 chifones en 5 semanas, <br className="hidden sm:inline" />
                <strong className="font-black text-slate-900">mantienes tu precio por mayor</strong> en cada compra.
              </p>
            ) : (
              <p>
                Válido solo si se cumple la <strong className="font-black text-slate-900">compra de 3 chifones por semana</strong>, <br className="hidden sm:inline" />
                durante 3 semanas consecutivas (10 chifones en total).
              </p>
            )}
          </div>

          {/* Correlativo manuscrito a la derecha */}
          <div className="text-right">
            <span className="font-serif italic font-bold text-3xl sm:text-4xl text-slate-900">
              {cartilla.numero_cartilla || '19/26'}
            </span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL PARA EDITAR METADATOS DE LA CARTILLA */}
      {/* ========================================================================= */}
      {editingMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-black text-slate-800">Editar Datos de la Cartilla</h4>
              <button onClick={() => setEditingMeta(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">N° Correlativo de Cartilla</label>
                <input
                  type="text"
                  value={numeroCartilla}
                  onChange={(e) => setNumeroCartilla(e.target.value)}
                  placeholder="Ej: 19/26"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas especiales (ej: feriados, prórroga)</label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: (+ 2 feriados 1 s/n clases)"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Cartilla</label>
                <select
                  value={tipoCartilla}
                  onChange={(e) => setTipoCartilla(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold cursor-pointer"
                >
                  <option value="Activo">Cliente Activo (Opción a Chifón Gratis)</option>
                  <option value="Preferente">Cliente Preferente (Control de Envase y Mayorista)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMeta(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMeta}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA EDITAR UN SLOT ESPECÍFICO */}
      {/* ========================================================================= */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-black text-slate-800">
                Editar Casilla #{editingSlot.slot_numero}
              </h4>
              <button onClick={() => setEditingSlot(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Abreviatura de Sabor</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {['CHC', 'Mrc', 'Nrj', 'L', 'O', 'CHM', 'P', 'MN'].map(sab => (
                    <button
                      key={sab}
                      type="button"
                      onClick={() => setSlotSabor(sab)}
                      className={cn(
                        "py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-colors",
                        slotSabor === sab ? "bg-orange-500 text-white border-orange-500" : "bg-slate-50 hover:bg-slate-100"
                      )}
                    >
                      {sab}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={slotSabor}
                  onChange={(e) => setSlotSabor(e.target.value.toUpperCase())}
                  maxLength={5}
                  placeholder="Código sabor (ej: CHC)"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Venta</label>
                <input
                  type="date"
                  value={slotFechaVenta}
                  onChange={(e) => setSlotFechaVenta(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slotEnvaseDevuelto}
                    onChange={(e) => setSlotEnvaseDevuelto(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 cursor-pointer"
                  />
                  <span>¿Envase devuelto físicamente?</span>
                </label>
              </div>

              {slotEnvaseDevuelto && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Devolución</label>
                  <input
                    type="date"
                    value={slotFechaDevolucion}
                    onChange={(e) => setSlotFechaDevolucion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSlot}
                className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
              >
                Guardar Casilla
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
