"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DescuentosPage() {
  const { data: volume } = useQuery<any>({ queryKey: ["discounts-volume"], queryFn: () => apiGet("/api/admin/discounts/volume") });
  const { data: season } = useQuery<any>({ queryKey: ["discounts-season"], queryFn: () => apiGet("/api/admin/discounts/season") });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Gestión de Descuentos</h2>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-slate-900">Descuentos por Volumen</CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">+ Nuevo rango</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Min</th>
                    <th className="px-6 py-4 font-medium">Max</th>
                    <th className="px-6 py-4 font-medium">Descuento</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {volume?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">{r.minQuantity}</td>
                      <td className="px-6 py-4">{r.maxQuantity ?? "∞"}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{Number(r.percentage)}%</td>
                      <td className="px-6 py-4"><Badge variant={r.isActive ? "success" : "destructive"} className={r.isActive ? "bg-emerald-100 text-emerald-800 border-none" : ""}>{r.isActive ? "Activo" : "Inactivo"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-slate-900">Descuentos de Temporada</CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">+ Nueva temporada</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nombre</th>
                    <th className="px-6 py-4 font-medium">Descuento</th>
                    <th className="px-6 py-4 font-medium">Inicio</th>
                    <th className="px-6 py-4 font-medium">Fin</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {season?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{s.name}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{Number(s.percentage)}%</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(s.startDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(s.endDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4"><Badge variant="outline" className="bg-white">{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
