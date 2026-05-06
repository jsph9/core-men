"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

const nextStatus: Record<string, string> = {
  REGISTERED: "IN_PRODUCTION",
  IN_PRODUCTION: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "DELIVERED",
};

export default function PedidosComerciante() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery<any>({ queryKey: ["merchant-orders"], queryFn: () => apiGet("/api/orders/merchant") });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPut(`/api/orders/merchant/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merchant-orders"] }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Panel Comerciante — Pedidos en Producción</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        {isLoading ? <p>Cargando...</p> : !orders?.length ? (
          <Card className="text-center py-16"><CardContent><p className="text-gray-500">No hay pedidos activos</p></CardContent></Card>
        ) : (
          orders.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Pedido #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-500">{formatDate(order.createdAt)} · {formatCurrency(Number(order.totalAmount))}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge>{order.status}</Badge>
                  {nextStatus[order.status] && (
                    <Button size="sm" onClick={() => advance.mutate({ id: order.id, status: nextStatus[order.status] })}>
                      Avanzar → {nextStatus[order.status].replace(/_/g, " ")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
