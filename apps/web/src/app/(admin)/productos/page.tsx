"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiDelete } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Edit2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

export default function ProductosAdminPage() {
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<any>({ queryKey: ["admin-products"], queryFn: () => apiGet("/api/products?limit=50&includeInactive=true") });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/products/${id}`),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(res.message || "Producto eliminado");
      setProductToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al eliminar el producto");
      setProductToDelete(null);
    }
  });

  const confirmDelete = (action: () => void) => {
    if (window.confirm("Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar permanentemente este producto?")) {
      action();
    }
  };

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
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <Link href={`/productos/${p.id}/editar`}><Button size="sm" variant="ghost" className="text-blue-600"><Edit2 className="w-4 h-4" /></Button></Link>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => confirmDelete(() => deleteMutation.mutate(p.id))} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4" /></Button>
                        </div>
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
