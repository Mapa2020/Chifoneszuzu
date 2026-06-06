import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Receipt, 
  Box, 
  Bell, 
  Menu, 
  X,
  LogOut,
  ChevronRight,
  FileText,
  Truck,
  ShoppingBag,
  UtensilsCrossed,
  ShieldCheck
} from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/dashboard';
import Login from './components/login';
import Ventas from './components/ventas';
import Insumos from './components/insumos';
import Productos from './components/productos';
import ReporteMensual from './components/reportemensual';
import Usuarios from './components/usuarios';
import Proveedores from './components/proveedores';
import Clientes from './components/clientes';
import Egresos from './components/egresos';
import Contenedores from './components/contenedores';
import PedidoCliente from './components/pedidocliente';
import { AuthProvider, useAuth } from './authcontext';
import { Toaster } from 'sonner';

function SidebarItem({ to, icon: Icon, label, active, isOpen }: { to: string, icon: React.ElementType, label: string, active: boolean, isOpen: boolean }) {
  return (
    <Link
      to={to}
      title={!isOpen ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
          : "text-slate-500 hover:bg-orange-50 hover:text-orange-600",
        !isOpen && "justify-center px-2"
      )}
    >
      <Icon size={20} className={cn("transition-transform group-hover:scale-110 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-orange-500")} />
      <span className={cn(
        "font-medium truncate transition-all duration-300 ease-in-out whitespace-nowrap",
        isOpen ? "opacity-100 translate-x-0 w-auto ml-0" : "opacity-0 -translate-x-4 w-0 ml-0 pointer-events-none"
      )}>
        {label}
      </span>
      {active && <ChevronRight size={16} className={cn("ml-auto shrink-0 transition-all duration-300", isOpen ? "opacity-100" : "opacity-0 w-0")} />}
    </Link>
  );
}

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  // Validación robusta de rol Admin
  const isAdmin = user.rol?.toLowerCase() === 'admin' || 
                  user.rol?.toLowerCase() === 'administrador';
  const isCliente = user.rol === 'Cliente';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full lg:w-20"
        )}
      >
        <div className={cn("flex flex-col h-full transition-all duration-300", isSidebarOpen ? "p-6" : "p-4")}>
          <div className={cn("flex items-center mb-10 px-2 transition-all duration-300", isSidebarOpen ? "gap-3" : "justify-center gap-0")}>
            <img 
              src="/images/mascota_zuzu.png" 
              alt="Mascota Zuzu" 
              className="w-10 h-10 object-contain shrink-0" 
            />
            <h1 className={cn(
              "text-xl font-bold tracking-tight text-slate-800 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
              isSidebarOpen ? "opacity-100 translate-x-0 w-auto" : "opacity-0 -translate-x-4 w-0"
            )}>
              Chifónes ZUZÚ
            </h1>
          </div>

          <nav className="space-y-2 flex-1">
            {!isCliente && (
              <>
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} isOpen={isSidebarOpen} />
                <SidebarItem to="/ventas" icon={ShoppingCart} label="Ventas" active={location.pathname === '/ventas'} isOpen={isSidebarOpen} />
                {isAdmin && <SidebarItem to="/productos" icon={UtensilsCrossed} label="Productos" active={location.pathname === '/productos'} isOpen={isSidebarOpen} />}
                {isAdmin && <SidebarItem to="/insumos" icon={Package} label="Insumos" active={location.pathname === '/insumos'} isOpen={isSidebarOpen} />}
                {isAdmin && <SidebarItem to="/reportes" icon={FileText} label="Reporte Mensual" active={location.pathname === '/reportes'} isOpen={isSidebarOpen} />}
                {isAdmin && <SidebarItem to="/usuarios" icon={ShieldCheck} label="Usuarios" active={location.pathname === '/usuarios'} isOpen={isSidebarOpen} />}
                {isAdmin && <SidebarItem to="/proveedores" icon={Truck} label="Proveedores" active={location.pathname === '/proveedores'} isOpen={isSidebarOpen} />}
                {isAdmin && <SidebarItem to="/clientes" icon={Users} label="Clientes" active={location.pathname === '/clientes'} isOpen={isSidebarOpen} />}
                {isAdmin && <SidebarItem to="/egresos" icon={Receipt} label="Egresos" active={location.pathname === '/egresos'} isOpen={isSidebarOpen} />}
                <SidebarItem to="/contenedores" icon={Box} label="Contenedores" active={location.pathname === '/contenedores'} isOpen={isSidebarOpen} />
              </>
            )}
            {isCliente && <SidebarItem to="/pedido" icon={ShoppingBag} label="Realizar Pedido" active={location.pathname === '/pedido'} isOpen={isSidebarOpen} />}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className={cn(
              "flex items-center px-2",
              isSidebarOpen ? "justify-between" : "flex-col gap-4"
            )}>
              <div className={cn("flex items-center transition-all duration-300", isSidebarOpen ? "gap-3" : "gap-0")}>
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className={cn(
                  "min-w-0 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                  isSidebarOpen ? "opacity-100 translate-x-0 w-auto" : "opacity-0 -translate-x-4 w-0"
                )}>
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.username}</p>
                  <p className="text-xs text-slate-500 truncate">{user.rol}</p>
                </div>
              </div>
              <button 
                onClick={logout} 
                className={cn(
                  "p-2 transition-colors rounded-lg",
                  isSidebarOpen 
                    ? "text-slate-400 hover:text-rose-500" 
                    : "bg-rose-50 text-rose-500 hover:bg-rose-100 w-full flex justify-center shadow-sm"
                )} 
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-40">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-orange-500 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">{new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </div>
        </header>

        <div className="p-8 overflow-auto">
          <Routes>
            {isCliente ? (
              <Route path="*" element={<PedidoCliente />} />
            ) : (
              <React.Fragment>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ventas" element={<Ventas />} />
                <Route path="/contenedores" element={<Contenedores />} />
                {isAdmin && (
                  <React.Fragment>
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/insumos" element={<Insumos />} />
                    <Route path="/reportes" element={<ReporteMensual />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/proveedores" element={<Proveedores />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/egresos" element={<Egresos />} />
                  </React.Fragment>
                )}
                {/* Ruta de respaldo para Admin/Vendedor */}
                <Route path="*" element={<Dashboard />} />
              </React.Fragment>
            )}
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
