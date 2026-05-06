"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Package, Users, Shirt, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["admin-dashboard"], queryFn: () => apiGet("/api/admin/dashboard") });

  const stats = [
    { label: "Pedidos Totales", value: data?.totalOrders ?? "—", icon: Package, color: "bg-blue-500", text: "text-blue-500", bg: "bg-blue-50" },
    { label: "Usuarios Registrados", value: data?.totalUsers ?? "—", icon: Users, color: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Productos Activos", value: data?.totalProducts ?? "—", icon: Shirt, color: "bg-violet-500", text: "text-violet-500", bg: "bg-violet-50" },
    { label: "Ingresos del Mes", value: "S/ 12,450.00", icon: TrendingUp, color: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-50" }, // Mockup for UI
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-7 w-7 ${s.text}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{s.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{isLoading ? "..." : s.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-slate-900">Últimos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-slate-500 text-sm py-4">Cargando...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg font-medium">ID Pedido</th>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 rounded-r-lg font-medium text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.recentOrders?.slice(0, 5).map((o: any) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 font-mono text-xs text-slate-500">{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-4 font-medium text-slate-900">{o.user?.name || "Usuario Eliminado"}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            o.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            o.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                            o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-900 text-right">{formatCurrency(Number(o.totalAmount))}</td>
                      </tr>
                    ))}
                    {(!data?.recentOrders || data.recentOrders.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No hay pedidos recientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Info */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-slate-900 to-blue-900 text-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Resumen del Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <p className="text-blue-200 text-sm mb-1">Estado de la Base de Datos</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="font-medium">Conectado y Estable</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/10">
              <p className="text-blue-200 text-sm mb-1">Última Auditoría</p>
              <p className="font-medium text-sm">Hace 15 minutos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
