import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Box,
  User,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../authcontext';
import { toast } from 'sonner';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { cn } from '../lib/utils';

interface Contenedor {
  contenedor_id: number;
  cliente_id: number;
  cliente_nombre?: string;
  estado: 'EnUso' | 'Devuelto' | 'Baja';
  uso_actual: number;
}

const columnHelper = createColumnHelper<Contenedor>();

export default function Contenedores() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Administrador';
  const [items, setItems] = useState<Contenedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contenedores', {
      headers: { 'Authorization': `Bearer ${user?.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  const handleDevolver = async (id: number) => {
    try {
      const res = await fetch(`/api/contenedores/devolver/${id}`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        toast.success("Envase devuelto");
        setItems(items.map(item => item.contenedor_id === id ? { ...item, estado: 'Devuelto' } : item));
      }
    } catch (error) {
      toast.error("Error al registrar devolución");
    }
  };

  const columns = [
    columnHelper.accessor('contenedor_id', {
      header: 'ID Envase',
      cell: info => <span className="font-mono text-xs font-bold text-slate-400">#ENV-{info.getValue()}</span>,
    }),
    columnHelper.accessor('cliente_nombre', {
      header: 'Cliente Actual',
      cell: info => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-400" />
          <span className="font-medium text-slate-700">{info.getValue() || 'Stock'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('estado', {
      header: 'Estado',
      cell: info => {
        const value = info.getValue();
        return (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
            value === 'EnUso' ? "bg-blue-50 text-blue-600" : 
            value === 'Devuelto' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {value === 'EnUso' && <Box size={12} />}
            {value === 'Devuelto' && <CheckCircle2 size={12} />}
            {value === 'Baja' && <AlertCircle size={12} />}
            {value}
          </div>
        );
      },
    }),
    columnHelper.accessor('uso_actual', {
      header: 'Ciclos de Uso',
      cell: info => {
        const value = info.getValue();
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full",
                  value >= 5 ? "bg-rose-500" : value >= 3 ? "bg-amber-500" : "bg-emerald-500"
                )} 
                style={{ width: `${Math.min((value / 5) * 100, 100)}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-slate-600">{value}/5</span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: isAdmin ? 'Acciones' : '',
      cell: info => (
        <div className="flex items-center gap-2">
          {isAdmin && info.row.original.estado === 'EnUso' && (
            <button 
              onClick={() => handleDevolver(info.row.original.contenedor_id)}
              className="p-1.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg text-slate-400 transition-colors" 
              title="Registrar Devolución"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            <MoreVertical size={16} />
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
          <h2 className="text-2xl font-bold text-slate-800">Control de Envases</h2>
          <p className="text-slate-500">Seguimiento de contenedores plásticos y ciclos de reutilización.</p>
        </div>
        {isAdmin && (
          <button className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200">
            <Plus size={20} />
            Registrar Envases
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">En Circulación</p>
          <p className="text-2xl font-bold text-blue-600">42</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">Devueltos Hoy</p>
          <p className="text-2xl font-bold text-emerald-600">18</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">Próximos a Baja</p>
          <p className="text-2xl font-bold text-amber-600">7</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium mb-1">Dados de Baja</p>
          <p className="text-2xl font-bold text-rose-600">12</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o ID..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all"
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
    </div>
  );
}
