"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function AuditoriaPage() {
  const { data, isLoading } = useQuery<{ data: any[]; meta: any }>({ queryKey: ["audit-log"], queryFn: () => apiGet("/api/admin/audit-log") });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Registro de Auditoría</h2>
      </div>
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Acciones del sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6">Cargando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Tipo</th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Detalle</th>
                    <th className="px-6 py-4 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.data?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500">{formatDate(log.timestamp)}</td>
                      <td className="px-6 py-4"><Badge variant="outline" className="bg-white">{log.type}</Badge></td>
                      <td className="px-6 py-4 font-medium text-slate-900">{log.user?.name || log.userId || "Sistema"}</td>
                      <td className="px-6 py-4 text-slate-600 truncate max-w-xs">{log.details ? JSON.stringify(log.details) : "—"}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">{log.ipAddress || "—"}</td>
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
