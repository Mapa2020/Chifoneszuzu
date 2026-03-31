export interface Usuario {
  usuario_id: number;
  username: string;
  rol: 'Admin' | 'Vendedor' | 'Cliente';
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
  tarjeta_snack: number;
}

export interface Venta {
  venta_id: number;
  fecha: string;
  cliente_id: number;
  cliente_nombre?: string;
  vendedor_nombre?: string;
  total: number;
  forma_pago: 'QR' | 'Contado' | 'CreditoDia';
}

export interface Egreso {
  egreso_id: number;
  fecha: string;
  tipo: 'Insumos' | 'Pasajes' | 'Almuerzo' | 'Sueldo' | 'Otros';
  concepto: string;
  monto: number;
  proveedor_id?: number;
}

export interface DashboardStats {
  salesToday: number;
  expensesToday: number;
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
  details: {
    salesCount: number;
    expensesCount: number;
    expensesByCategory: Array<{ tipo: string; total: number }>;
    dailySales: Array<{ fecha: string; total: number }>;
    productPerformance: Array<{ 
      nombre: string; 
      totalQty: number; 
      totalRevenue: number 
    }>;
  };
}
