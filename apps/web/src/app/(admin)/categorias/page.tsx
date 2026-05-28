"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CategoriasPage() {
  const qc = useQueryClient();
  const [categoryName, setCategoryName] = useState("");
  const [fabricName, setFabricName] = useState("");
  const [sizeName, setSizeName] = useState("");
  const { data } = useQuery<any>({ queryKey: ["admin-attributes"], queryFn: () => apiGet("/api/admin/attributes?includeInactive=true") });

  const createCategory = useMutation({ mutationFn: () => apiPost("/api/admin/categories", { name: categoryName }), onSuccess: () => { setCategoryName(""); qc.invalidateQueries({ queryKey: ["admin-attributes"] }); } });
  const createFabric = useMutation({ mutationFn: () => apiPost("/api/admin/fabrics", { value: fabricName }), onSuccess: () => { setFabricName(""); qc.invalidateQueries({ queryKey: ["admin-attributes"] }); } });
  const createSize = useMutation({ mutationFn: () => apiPost("/api/admin/sizes", { value: sizeName }), onSuccess: () => { setSizeName(""); qc.invalidateQueries({ queryKey: ["admin-attributes"] }); } });

  const toggleCategory = useMutation({ mutationFn: ({ id, isActive }: any) => apiPatch(`/api/admin/categories/${id}`, { isActive }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-attributes"] }) });
  const toggleFabric = useMutation({ mutationFn: ({ id, isActive }: any) => apiPatch(`/api/admin/fabrics/${id}`, { isActive }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-attributes"] }) });
  const toggleSize = useMutation({ mutationFn: ({ id, isActive }: any) => apiPatch(`/api/admin/sizes/${id}`, { isActive }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-attributes"] }) });

  const deleteCategory = useMutation({ mutationFn: (id: string) => apiDelete(`/api/admin/categories/${id}`), onSuccess: (res: any) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ["admin-attributes"] }); }, onError: (err: any) => toast.error(err.message) });
  const deleteFabric = useMutation({ mutationFn: (id: string) => apiDelete(`/api/admin/fabrics/${id}`), onSuccess: (res: any) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ["admin-attributes"] }); }, onError: (err: any) => toast.error(err.message) });
  const deleteSize = useMutation({ mutationFn: (id: string) => apiDelete(`/api/admin/sizes/${id}`), onSuccess: (res: any) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ["admin-attributes"] }); }, onError: (err: any) => toast.error(err.message) });

  const categories = data?.categories || [];
  const fabrics = data?.fabrics || [];
  const sizes = data?.sizes || [];

  const confirmDelete = (action: () => void) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar permanentemente este elemento?")) action();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Gestión Maestra</h2></div>
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-lg font-bold text-slate-900">Categorías (Polos, Poleras)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2"><Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Nueva categoría" /><Button onClick={() => createCategory.mutate()} className="bg-blue-600 hover:bg-blue-700">Agregar</Button></div>
          <div className="space-y-2">{categories.map((c: any) => <div key={c.id} className="flex items-center justify-between"><span>{c.name}</span><div className="flex items-center gap-2"><Badge variant={c.isActive ? "success" : "destructive"}>{c.isActive ? "Activa" : "Inactiva"}</Badge><Button size="sm" variant="outline" onClick={() => toggleCategory.mutate({ id: c.id, isActive: !c.isActive })}>{c.isActive ? "Desactivar" : "Activar"}</Button><Button size="sm" variant="ghost" className="text-red-600 px-2" onClick={() => confirmDelete(() => deleteCategory.mutate(c.id))}><Trash2 className="w-4 h-4" /></Button></div></div>)}</div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-lg font-bold text-slate-900">Telas permitidas (Algodón, Piqué)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2"><Input value={fabricName} onChange={(e) => setFabricName(e.target.value)} placeholder="Nueva tela" /><Button onClick={() => createFabric.mutate()} className="bg-blue-600 hover:bg-blue-700">Agregar</Button></div>
          <div className="space-y-2">{fabrics.map((f: any) => <div key={f.id} className="flex items-center justify-between"><span>{f.value}</span><div className="flex items-center gap-2"><Badge variant={f.isActive ? "success" : "destructive"}>{f.isActive ? "Activa" : "Inactiva"}</Badge><Button size="sm" variant="outline" onClick={() => toggleFabric.mutate({ id: f.id, isActive: !f.isActive })}>{f.isActive ? "Desactivar" : "Activar"}</Button><Button size="sm" variant="ghost" className="text-red-600 px-2" onClick={() => confirmDelete(() => deleteFabric.mutate(f.id))}><Trash2 className="w-4 h-4" /></Button></div></div>)}</div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-sm">
        <CardHeader><CardTitle className="text-lg font-bold text-slate-900">Tallas permitidas (S, M, L)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2"><Input value={sizeName} onChange={(e) => setSizeName(e.target.value)} placeholder="Nueva talla" /><Button onClick={() => createSize.mutate()} className="bg-blue-600 hover:bg-blue-700">Agregar</Button></div>
          <div className="space-y-2">{sizes.map((s: any) => <div key={s.id} className="flex items-center justify-between"><span>{s.value}</span><div className="flex items-center gap-2"><Badge variant={s.isActive ? "success" : "destructive"}>{s.isActive ? "Activa" : "Inactiva"}</Badge><Button size="sm" variant="outline" onClick={() => toggleSize.mutate({ id: s.id, isActive: !s.isActive })}>{s.isActive ? "Desactivar" : "Activar"}</Button><Button size="sm" variant="ghost" className="text-red-600 px-2" onClick={() => confirmDelete(() => deleteSize.mutate(s.id))}><Trash2 className="w-4 h-4" /></Button></div></div>)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
