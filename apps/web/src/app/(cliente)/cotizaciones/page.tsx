"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" }> = {
  PENDING: { label: "Pendiente", variant: "warning" },
  QUOTED: { label: "Cotizado", variant: "default" },
  APPROVED: { label: "Aprobada", variant: "success" },
  REJECTED: { label: "Rechazada", variant: "destructive" },
  UNFEASIBLE: { label: "Inviable", variant: "destructive" },
};

export default function CotizacionesClientePage() {
  const { data: quotes, isLoading } = useQuery<any>({ queryKey: ["quotes"], queryFn: () => apiGet("/api/quotes") });

  return (
    <div className="min-h-screen bg-gray-50">
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
            return (
              <Card key={q.id} className="hover:shadow-md transition">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Cotización #{q.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{q.garmentType} · {q.totalQuantity} uds · {formatDate(q.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    {q.whatsappUrl && <a href={q.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">💬 WhatsApp</a>}
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
