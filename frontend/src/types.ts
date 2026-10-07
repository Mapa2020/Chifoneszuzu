export interface Usuario {
  usuario_id: number;
  username: string;
  rol: 'Administrador' | 'Vendedor' | 'Cliente';
  token?: string;
}

export interface Ingrediente {
  ingrediente_id: number;
  nombre: string;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
}

export interface Producto {
  producto_id: number;
  nombre: string;
  sabor: string;
  precio_snack: number;
  precio_externo: number;
  precio_especial: number;
  costo_produccion?: number;
}

export interface Cliente {
  cliente_id: number;
  nombre: string;
  categoria: 'Snack' | 'Externo' | 'Especial';
  telefono: string;
  direccion: string;
  zona?: string;
  tarjeta_snack: number;
}

export interface Venta {
  venta_id: number;
  fecha: string;
  hora?: string;
  cliente_id: number;
  cliente_nombre?: string;
  cliente_telefono?: string;
  vendedor_nombre?: string;
  subtotal?: number;
  descuento?: number;
  envio?: number;
  impuesto?: number;
  total: number;
  forma_pago: 'QR' | 'Contado' | 'CreditoDia';
  estado_pago?: 'Pagado' | 'Pendiente';
}

export interface Egreso {
  egreso_id: number;
  fecha: string;
  ambito?: 'Proceso' | 'Personal' | 'Casa';
  categoria?: string;
  cantidad?: number;
  precio_unitario?: number;
  tipo?: string;
  concepto: string;
  monto: number;
  proveedor_id?: number;
  proveedor_nombre?: string;
  ingrediente_id?: number;
  ingrediente_nombre?: string;
  ingrediente_unidad?: string;
}

export interface PendienteCobro {
  venta_id: number;
  fecha: string;
  hora?: string;
  total: number;
  forma_pago: string;
  estado_pago: 'Pendiente';
  cliente_id: number;
  cliente_nombre?: string;
  cliente_telefono?: string;
  vendedor_nombre?: string;
}

export interface DashboardStats {
  salesToday: number;
  expensesToday: number;
  expensesTodayDetails?: {
    proceso: number;
    personal: number;
    casa: number;
  };
  finanzasMes?: {
    totalIngresosMes: number;
    fondoOperativo70: number;
    gastosProcesoMes: number;
    gastosPersonalMes: number;
    saldoOperativoMes: number;
    utilidades30Mes: number;
    gastosCasaMes: number;
    saldoUtilidadesMes: number;
    saldoTotalMes: number;
    totalGastosMes: number;
  };
  cobranzas?: {
    countPendientes: number;
    totalPendiente: number;
    pendientes: PendienteCobro[];
  };
  lowStockCount: number;
  pendingContainers: number;
  lowStockItems?: Array<{
    nombre: string;
    stock_actual: number;
    unidad_medida: string;
  }>;
}

export interface MonthlyReportData {
  year: number;
  month: number;
  totalSales: number;
  totalExpenses: number;
  netUtility: number;
  modelo7030?: {
    fondoOperativo70: number;
    gastosProceso: number;
    gastosPersonal: number;
    saldoOperativo: number;
    utilidades30: number;
    gastosCasa: number;
    saldoUtilidades: number;
    saldoTotal: number;
  };
  details: {
    salesCount: number;
    expensesCount: number;
    expensesByAmbito?: Array<{ ambito: string; total: number; count: number }>;
    expensesByCategory: Array<{ tipo?: string; categoria?: string; ambito?: string; total: number }>;
    dailySales: Array<{ fecha: string; total: number }>;
    dailyExpenses?: Array<{ fecha: string; total: number }>;
    productPerformance: Array<{ 
      nombre: string; 
      totalQty: number; 
      totalRevenue: number 
    }>;
  };
}

export interface DespachoPedidoDetalle {
  producto_nombre: string;
  cantidad: number;
  subtotal: number;
}

export interface DespachoPedido {
  cliente_id: number;
  cliente_nombre: string;
  nombre_despacho: string;
  direccion?: string;
  total_monto: number;
  total_unidades: number;
  detalles: DespachoPedidoDetalle[];
}

export interface DespachoZona {
  zona: string;
  totalMonto: number;
  totalUnidades: number;
  pedidos: DespachoPedido[];
}

export interface DespachoData {
  fecha: string;
  fechaFormateada: string;
  totalVentas: number;
  totalUnidades: number;
  inversion70: number;
  casa30: number;
  zonas: DespachoZona[];
  mensajeWhatsapp: string;
}

