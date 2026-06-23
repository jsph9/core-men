"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" }> = {
  PENDING: { label: "Pendiente", variant: "warning" },
  IN_REVIEW: { label: "Cotizado / En Revisión", variant: "warning" },
  WAITING_PAYMENT: { label: "Aprobada / Esperando Pago", variant: "success" },
  IN_PRODUCTION: { label: "En Producción", variant: "success" },
  READY_FOR_PICKUP: { label: "Listo para Retiro", variant: "success" },
  DELIVERED: { label: "Entregada", variant: "default" },
  CANCELLED: { label: "Cancelada / Inviable", variant: "destructive" },
};

export default function CotizacionesClientePage() {
  const queryClient = useQueryClient();
  const { data: quotes, isLoading } = useQuery<any>({ 
    queryKey: ["quotes"], 
    queryFn: () => apiGet("/api/quotes") 
  });

  const approveQuote = useMutation({
    mutationFn: (quoteId: string) => apiPatch(`/api/quotes/${quoteId}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Cotización aprobada correctamente. Ahora puede proceder con la formalización/pago.");
    },
    onError: (err: any) => {
      toast.error("Error al aprobar cotización", { description: err.message });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/catalogo" className="text-xl font-bold text-gray-900">Core<span className="text-blue-600">Men</span></Link>
          <h2 className="text-lg font-semibold">Mis Cotizaciones</h2>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)
        ) : !quotes?.length ? (
          <Card className="text-center py-16"><CardContent><p className="text-gray-500 text-lg">No tienes cotizaciones</p></CardContent></Card>
        ) : (
          quotes.map((q: any) => {
            const s = statusMap[q.status] || { label: q.status, variant: "default" as const };
            const garmentText = q.items && q.items.length > 0 
              ? Array.from(new Set(q.items.map((item: any) => item.productVariant?.product?.category?.name || item.productVariant?.product?.name))).filter(Boolean).join(", ")
              : "Prenda";

            return (
              <Card key={q.id} className="hover:shadow-md transition border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">Cotización #{q.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{garmentText} · {q.totalQuantity} uds · {formatDate(q.createdAt)}</p>
                    
                    {q.status === "PENDING" && q.estimatedPrice && (
                      <p className="text-sm font-medium text-slate-600 mt-1">
                        Precio Estimado (Software): <span className="font-bold text-slate-900">S/ {Number(q.estimatedPrice).toFixed(2)}</span>
                      </p>
                    )}

                    {q.status === "IN_REVIEW" && (
                      <div className="space-y-1.5 mt-1">
                        {q.customerPrice && (
                          <p className="text-sm font-medium text-blue-600">
                            Precio Propuesto: <span className="font-bold">S/ {Number(q.customerPrice).toFixed(2)}</span>
                          </p>
                        )}
                        {q.estimatedProductionTime && (
                          <p className="text-xs text-slate-600 font-medium">
                            Tiempo de Producción: <span className="font-bold text-slate-950">{q.estimatedProductionTime} días hábiles</span>
                          </p>
                        )}
                        {q.merchantMessage && (
                          <span className="text-xs text-slate-500 block font-normal mt-0.5">
                            Mensaje comercial: "{q.merchantMessage}"
                          </span>
                        )}
                      </div>
                    )}

                    {["WAITING_PAYMENT", "IN_PRODUCTION", "READY_FOR_PICKUP", "DELIVERED"].includes(q.status) && (
                      <div className="space-y-1.5 mt-1">
                        {q.finalPrice && (
                          <p className="text-sm font-medium text-emerald-600">
                            Precio Final: <span className="font-bold">S/ {Number(q.finalPrice).toFixed(2)}</span>
                          </p>
                        )}
                        {q.estimatedProductionTime && (
                          <p className="text-xs text-slate-600 font-medium">
                            Tiempo de Producción: <span className="font-bold text-slate-950">{q.estimatedProductionTime} días hábiles</span>
                          </p>
                        )}
                        {q.merchantMessage && (
                          <span className="text-xs text-slate-500 block font-normal mt-0.5">
                            Mensaje comercial: "{q.merchantMessage}"
                          </span>
                        )}
                      </div>
                    )}

                    {q.status === "CANCELLED" && (
                      <div className="space-y-1 mt-1 text-slate-500 text-xs">
                        {q.finalPrice ? (
                          <p>Precio Final: S/ {Number(q.finalPrice).toFixed(2)}</p>
                        ) : q.customerPrice ? (
                          <p>Precio Propuesto: S/ {Number(q.customerPrice).toFixed(2)}</p>
                        ) : q.estimatedPrice ? (
                          <p>Precio Estimado (Software): S/ {Number(q.estimatedPrice).toFixed(2)}</p>
                        ) : null}
                      </div>
                    )}

                    {q.status === "CANCELLED" && q.unfeasibleReason ? (
                      <p className="mt-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
                        Motivo técnico: {q.unfeasibleReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    {q.status === "IN_REVIEW" && (
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                        onClick={() => approveQuote.mutate(q.id)}
                        disabled={approveQuote.isPending}
                      >
                        {approveQuote.isPending ? "Aprobando..." : "Aprobar Cotización"}
                      </Button>
                    )}
                    {q.whatsappUrl && <a href={q.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm font-medium">💬 WhatsApp</a>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
