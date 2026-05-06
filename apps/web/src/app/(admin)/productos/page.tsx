"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function ProductosAdminPage() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["admin-products"], queryFn: () => apiGet("/api/products?limit=50") });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Gestión de Productos</h2>
        <Link href="/productos/nuevo">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">+ Nuevo Producto</Button>
        </Link>
      </div>
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? <p className="p-6">Cargando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nombre</th>
                    <th className="px-6 py-4 font-medium">Categoría</th>
                    <th className="px-6 py-4 font-medium">Precio Base</th>
                    <th className="px-6 py-4 font-medium">Tela</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.data?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 text-slate-500">{p.category?.name}</td>
                      <td className="px-6 py-4 font-medium">{formatCurrency(Number(p.basePrice))}</td>
                      <td className="px-6 py-4"><Badge variant="outline" className="bg-white">{p.fabric?.value || "—"}</Badge></td>
                      <td className="px-6 py-4">{p.isActive ? <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-none">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}</td>
                      <td className="px-6 py-4 text-right"><Button size="sm" variant="ghost" className="text-blue-600">Editar</Button></td>
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
