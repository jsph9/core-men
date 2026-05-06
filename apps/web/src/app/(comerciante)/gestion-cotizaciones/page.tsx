"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default function CotizacionesComerciante() {
  const queryClient = useQueryClient();
  const { data: quotes, isLoading } = useQuery<any>({ queryKey: ["merchant-quotes"], queryFn: () => apiGet("/api/merchant/quotes") });

  const respond = useMutation({
    mutationFn: ({ id, quotedPrice, merchantMessage }: any) => apiPut(`/api/merchant/quotes/${id}/respond`, { quotedPrice, merchantMessage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merchant-quotes"] }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Panel Comerciante — Cotizaciones</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        {isLoading ? <p>Cargando...</p> : !quotes?.length ? (
          <Card className="text-center py-16"><CardContent><p className="text-gray-500">No hay cotizaciones pendientes</p></CardContent></Card>
        ) : (
          quotes.map((q: any) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">Cotización #{q.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{q.garmentType} · {q.fabricType} · {q.color} · {q.totalQuantity} uds</p>
                    <p className="text-xs text-gray-400">{formatDate(q.createdAt)}</p>
                  </div>
                  <Badge>{q.status}</Badge>
                </div>
                {q.message && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">"{q.message}"</p>}
                {q.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { const price = prompt("Ingresa el precio cotizado:"); if (price) respond.mutate({ id: q.id, quotedPrice: parseFloat(price), merchantMessage: "Precio confirmado" }); }}>
                      Responder con precio
                    </Button>
                    <Button size="sm" variant="destructive">Marcar inviable</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
