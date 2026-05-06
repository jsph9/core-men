"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function ErroresPage() {
  const queryClient = useQueryClient();
  const { data: errors, isLoading } = useQuery<any>({ queryKey: ["error-log"], queryFn: () => apiGet("/api/admin/error-log") });

  const markReviewed = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/admin/error-log/${id}/review`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["error-log"] }),
  });

  const severityColor: Record<string, string> = { CRITICAL: "destructive", HIGH: "warning", MEDIUM: "default" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Log de Errores</h2>
      </div>
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Errores del sistema detectados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6">Cargando...</p> : !errors?.length ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Sistema Saludable</h3>
              <p className="text-slate-500">No hay errores registrados en el sistema en este momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Fecha</th>
                    <th className="px-6 py-4 font-medium">Severidad</th>
                    <th className="px-6 py-4 font-medium">Tipo</th>
                    <th className="px-6 py-4 font-medium">Mensaje</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {errors.map((err: any) => (
                    <tr key={err.id} className={`hover:bg-slate-50/50 transition-colors ${err.isReviewed ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 text-xs text-slate-500">{formatDate(err.timestamp)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={(severityColor[err.severity] || "default") as any}>{err.severity}</Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 bg-slate-50 rounded inline-block mt-3">{err.type}</td>
                      <td className="px-6 py-4 text-slate-900 max-w-xs truncate" title={err.message}>{err.message}</td>
                      <td className="px-6 py-4">
                        {err.isReviewed ? <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-none">Revisado</Badge> : <Badge variant="warning">Pendiente</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!err.isReviewed && (
                          <Button size="sm" variant="outline" onClick={() => markReviewed.mutate(err.id)}>Marcar revisado</Button>
                        )}
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
