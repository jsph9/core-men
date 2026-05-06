"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" }> = {
  REGISTERED: { label: "Registrado", variant: "default" },
  IN_PRODUCTION: { label: "En Producción", variant: "warning" },
  READY_FOR_PICKUP: { label: "Listo para Recojo", variant: "success" },
  DELIVERED: { label: "Entregado", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
};

export default function PedidosPage() {
  const { data: orders, isLoading } = useQuery<any>({ queryKey: ["orders"], queryFn: () => apiGet("/api/orders") });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/catalogo" className="text-xl font-bold text-gray-900">Core<span className="text-blue-600">Men</span></Link>
          <h2 className="text-lg font-semibold">Mis Pedidos</h2>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)
        ) : !orders?.length ? (
          <Card className="text-center py-16"><CardContent><p className="text-gray-500 text-lg">No tienes pedidos aún</p></CardContent></Card>
        ) : (
          orders.map((order: any) => {
            const s = statusMap[order.status] || { label: order.status, variant: "default" as const };
            return (
              <Card key={order.id} className="hover:shadow-md transition">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)} · {order.items?.length} items</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <p className="font-bold text-lg">{formatCurrency(Number(order.totalAmount))}</p>
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
