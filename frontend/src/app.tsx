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
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Ventas from './components/Ventas';
import Insumos from './components/Insumos';
import Productos from './components/Productos';
import ReporteMensual from './components/ReporteMensual';
import Usuarios from './components/Usuarios';
import Proveedores from './components/Proveedores';
import Clientes from './components/Clientes';
import Egresos from './components/Egresos';
import Contenedores from './components/Contenedores';
import PedidoCliente from './components/PedidoCliente';
import { AuthProvider, useAuth } from './authcontext';
import { Toaster } from 'sonner';

function SidebarItem({ 
  to, 
  icon: Icon, 
  label, 
  active, 
  isOpen, 
  onClick 
}: { 
  to: string, 
  icon: React.ElementType, 
  label: string, 
  active: boolean, 
  isOpen: boolean,
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-3 transition-all duration-200 group relative",
        isOpen 
          ? "px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl" 
          : "w-11 h-11 mx-auto rounded-xl justify-center p-0",
        active 
          ? "bg-orange-500 text-white shadow-md shadow-orange-200" 
          : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"
      )}
    >
      <Icon 
        size={20} 
        className={cn(
          "transition-transform group-hover:scale-110 shrink-0", 
          active ? "text-white" : "text-slate-400 group-hover:text-orange-500"
        )} 
      />
      {isOpen && (
        <>
          <span className="font-medium truncate whitespace-nowrap text-sm">
            {label}
          </span>
          {active && <ChevronRight size={16} className="ml-auto shrink-0 opacity-80" />}
        </>
      )}
    </Link>
  );
}

function AppContent() {
  // En móviles inicia colapsado (solo iconos) para dar prioridad al contenido
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  // Validación robusta de rol Admin
  const isAdmin = user.rol?.toLowerCase() === 'admin' || 
                  user.rol?.toLowerCase() === 'administrador';
  const isCliente = user.rol === 'Cliente';

  const handleItemClick = () => {
    // Al hacer clic en un ítem en móvil/pantalla pequeña, colapsar a solo iconos
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      {/* Backdrop para móvil cuando el menú está expandido */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Spacer en móvil cuando el sidebar está expandido como overlay para evitar saltos */}
      <div className={cn("hidden", isSidebarOpen && "block lg:hidden w-16 shrink-0")} />

      {/* Sidebar: Siempre visible. En móvil se colapsa a ancho w-16 (solo iconos) o se expande a w-64 */}
      <aside 
        className={cn(
          "sticky top-0 h-screen z-50 bg-white border-r border-slate-100 transition-all duration-300 ease-in-out shrink-0 flex flex-col",
          isSidebarOpen 
            ? "fixed inset-y-0 left-0 w-64 shadow-2xl lg:shadow-none lg:sticky lg:w-72" 
            : "w-16 lg:w-20"
        )}
      >
        <div className={cn("flex flex-col h-full transition-all duration-300", isSidebarOpen ? "p-4 sm:p-6" : "p-2 sm:p-3")}>
          {/* Logo y Encabezado */}
          <div className={cn(
            "flex items-center mb-6 sm:mb-8 px-1 transition-all duration-300", 
            isSidebarOpen ? "justify-between" : "justify-center"
          )}>
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src="/images/mascota_zuzu.png" 
                alt="Mascota Zuzu" 
                className="w-10 h-10 object-contain shrink-0" 
              />
              {isSidebarOpen && (
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 truncate whitespace-nowrap">
                  Chifónes ZUZÚ
                </h1>
              )}
            </div>

            {/* Botón para colapsar a solo iconos visible cuando está expandido */}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Colapsar a solo iconos"
                aria-label="Colapsar a solo iconos"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Navegación */}
          <nav className="space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden py-1">
            {!isCliente && (
              <>
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} isOpen={isSidebarOpen} onClick={handleItemClick} />
                {isAdmin && <SidebarItem to="/reportes" icon={FileText} label="Reporte Mensual" active={location.pathname === '/reportes'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
                <SidebarItem to="/ventas" icon={ShoppingCart} label="Ventas" active={location.pathname === '/ventas'} isOpen={isSidebarOpen} onClick={handleItemClick} />
                {isAdmin && <SidebarItem to="/egresos" icon={Receipt} label="Egresos" active={location.pathname === '/egresos'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
                {isAdmin && <SidebarItem to="/productos" icon={UtensilsCrossed} label="Productos" active={location.pathname === '/productos'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
                {isAdmin && <SidebarItem to="/insumos" icon={Package} label="Insumos" active={location.pathname === '/insumos'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
                {isAdmin && <SidebarItem to="/usuarios" icon={ShieldCheck} label="Usuarios" active={location.pathname === '/usuarios'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
                {isAdmin && <SidebarItem to="/proveedores" icon={Truck} label="Proveedores" active={location.pathname === '/proveedores'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
                {isAdmin && <SidebarItem to="/clientes" icon={Users} label="Clientes" active={location.pathname === '/clientes'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
                <SidebarItem to="/contenedores" icon={Box} label="Contenedores" active={location.pathname === '/contenedores'} isOpen={isSidebarOpen} onClick={handleItemClick} />
              </>
            )}
            {isCliente && <SidebarItem to="/pedido" icon={ShoppingBag} label="Realizar Pedido" active={location.pathname === '/pedido'} isOpen={isSidebarOpen} onClick={handleItemClick} />}
          </nav>

          {/* Perfil del Usuario / Logout */}
          <div className="mt-auto pt-3 border-t border-slate-100">
            <div className={cn(
              "flex items-center px-1",
              isSidebarOpen ? "justify-between" : "flex-col gap-2 justify-center"
            )}>
              <div className={cn("flex items-center transition-all duration-300", isSidebarOpen ? "gap-3" : "justify-center")}>
                <div 
                  title={user.username}
                  className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0 shadow-xs"
                >
                  {user.username.charAt(0).toUpperCase()}
                </div>
                {isSidebarOpen && (
                  <div className="min-w-0 transition-all duration-300 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-800 truncate">{user.username}</p>
                    <p className="text-xs text-slate-500 truncate">{user.rol}</p>
                  </div>
                )}
              </div>
              <button 
                onClick={logout} 
                className={cn(
                  "p-2 transition-colors rounded-lg flex items-center justify-center",
                  isSidebarOpen 
                    ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50" 
                    : "text-slate-400 hover:text-rose-500 hover:bg-rose-50 w-10 h-10"
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
        <header className="h-16 sm:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-3 sm:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center justify-center"
              title={isSidebarOpen ? "Colapsar menú (solo iconos)" : "Expandir menú"}
              aria-label={isSidebarOpen ? "Colapsar menú" : "Expandir menú"}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="text-xs sm:text-sm font-medium text-slate-500 hidden sm:inline-block">
              {isSidebarOpen ? "Colapsar menú" : "Expandir menú"}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <button className="relative p-2 text-slate-400 hover:text-orange-500 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 sm:h-8 w-px bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-medium text-slate-600 capitalize">
                {new Date().toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-6 md:p-8 overflow-auto flex-1">
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
