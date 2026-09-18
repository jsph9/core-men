"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ClipboardList, 
  ShoppingBag, 
  Shirt, 
  LogOut,
  Menu,
  X,
  UserCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/gestion-cotizaciones", label: "Cotizaciones", icon: ClipboardList },
  { href: "/gestion-pedidos", label: "Gestión de Pedidos", icon: ShoppingBag },
  { href: "/catalogo-prendas", label: "Catálogo de Prendas", icon: Shirt },
];

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("merchant_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("merchant_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Validación de seguridad: Buscamos al usuario y verificamos que sea Vendedor
  const { data: me, isLoading } = useQuery<{ name: string; email: string; role: string }>({
    queryKey: ["me-merchant-layout"],
    queryFn: () => apiGet("/api/auth/me"),
    retry: false,
  });
  useEffect(() => {
    if (!isLoading && (!me || me.role !== "MERCHANT")) {
      router.replace("/auth/login");
    }
  }, [isLoading, me, router]);


  const handleLogout = async () => {
    await apiPost("/api/auth/logout", {});
    router.replace("/auth/login");
  };

  if (isLoading || !me || me.role !== "MERCHANT") {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="rounded-xl border border-gray-200/60 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm text-[#6B7280]">Validando permisos de comerciante...</p>
        </div>
      </div>
    );
  }
  const activeRoute = NAV_ITEMS.find(item => pathname?.startsWith(item.href));
  const pageTitle = activeRoute ? activeRoute.label : "Panel de Vendedor";

  return (
    <div 
      className="min-h-screen bg-slate-50 flex"
      style={{ '--sidebar-width': isCollapsed ? '5rem' : '16rem' } as React.CSSProperties}
    >
      {/* Sidebar - Desktop */}
      <aside 
        className={`hidden md:flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 border-r border-slate-800 fixed h-full z-40 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className={`h-16 flex items-center bg-slate-950/50 border-b border-slate-800 shrink-0 transition-all duration-300 ${isCollapsed ? "justify-center px-2" : "px-4 gap-3"}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none shrink-0"
            title={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          >
            <Menu className="h-5 w-5" />
          </button>

          {!isCollapsed && (
            <Link href="/gestion-cotizaciones" className="text-xl font-extrabold tracking-tight text-white truncate transition-opacity duration-200">
              Core<span className="text-blue-500">Men</span> <span className="text-sm font-medium text-slate-500 ml-1">Ventas</span>
            </Link>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg font-medium transition-colors ${
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <button 
            onClick={handleLogout} 
            title={isCollapsed ? "Cerrar Sesión" : undefined}
            className={`flex items-center w-full rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out md:hidden ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950/50 border-b border-slate-800">
          <span className="text-xl font-extrabold tracking-tight text-white">CoreMen Ventas</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium ${
                pathname?.startsWith(item.href) ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? "md:ml-20" : "md:ml-64"}`}>
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-slate-500 hover:text-slate-900 p-1 -ml-1 rounded-md"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            
            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{me.name}</p>
                  <p className="text-xs text-slate-500 leading-tight">Vendedor</p>
                </div>
              <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                <UserCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}