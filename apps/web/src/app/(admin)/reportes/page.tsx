"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ReportesPage() {
  const { data: sales, isLoading } = useQuery<any>({ queryKey: ["reports-sales"], queryFn: () => apiGet("/api/admin/reports/sales") });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Reportes de Ventas</h2>
        <Button size="sm" variant="outline" className="bg-white"><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
      </div>
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Historial de Ventas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6">Cargando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Pedido</th>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Items</th>
                    <th className="px-6 py-4 font-medium">Total</th>
                    <th className="px-6 py-4 font-medium">Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales?.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{o.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">{formatDate(o.createdAt)}</td>
                      <td className="px-6 py-4 font-medium">{o.items?.length || 0}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(Number(o.totalAmount))}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${o.payment?.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {o.payment?.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
