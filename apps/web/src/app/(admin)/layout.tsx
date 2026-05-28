"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  PercentCircle, 
  Users, 
  BarChart3, 
  ShieldAlert, 
  AlertTriangle,
  LogOut,
  Menu,
  X,
  UserCircle
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/descuentos", label: "Descuentos", icon: PercentCircle },
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/auditoria", label: "Auditoría", icon: ShieldAlert },
  { href: "/errores", label: "Errores", icon: AlertTriangle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: me, isLoading } = useQuery<{ name: string; email: string; role: string }>({
    queryKey: ["me-admin-layout"],
    queryFn: () => apiGet("/api/auth/me"),
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (!me || me.role !== "ADMIN")) {
      router.replace("/auth/login");
    }
  }, [isLoading, me, router]);

  const handleLogout = async () => {
    await apiPost("/api/auth/logout", {});
    router.replace("/auth/login");
  };

  if (isLoading || !me || me.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="rounded-xl border border-gray-200/60 bg-white px-6 py-5 shadow-sm">
          <p className="text-sm text-[#6B7280]">Validando permisos de administrador...</p>
        </div>
      </div>
    );
  }

  const activeRoute = NAV_ITEMS.find(item => pathname?.startsWith(item.href));
  const pageTitle = activeRoute ? activeRoute.label : "Admin Panel";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 transition-all border-r border-slate-800 fixed h-full z-40">
        <div className="h-16 flex items-center px-6 bg-slate-950/50 border-b border-slate-800 shrink-0">
          <Link href="/dashboard" className="text-xl font-extrabold tracking-tight text-white">
            Core<span className="text-blue-500">Men</span> <span className="text-sm font-medium text-slate-500 ml-1">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar Sesión</span>
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
          <span className="text-xl font-extrabold tracking-tight text-white">CoreMen Admin</span>
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
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 transition-all">
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
            {/* Action Buttons specific to the page could go here */}
            
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            
            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{me.name}</p>
                  <p className="text-xs text-slate-500 leading-tight">{me.email}</p>
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
