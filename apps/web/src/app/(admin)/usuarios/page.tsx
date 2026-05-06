"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery<any>({ queryKey: ["admin-users"], queryFn: () => apiGet("/api/admin/users") });

  const revokeUser = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/admin/users/${id}/revoke`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const unlockUser = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/admin/users/${id}/unlock`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const activateUser = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/admin/users/${id}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Gestión de Usuarios</h2>
      </div>
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? <p className="p-6">Cargando...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nombre</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Rol</th>
                    <th className="px-6 py-4 font-medium">Estado</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                      <td className="px-6 py-4 text-slate-500">{u.email}</td>
                      <td className="px-6 py-4"><Badge variant="outline" className="bg-white">{u.role}</Badge></td>
                      <td className="px-6 py-4">
                        {u.isActive ? <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-none">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
                        {u.lockedUntil && new Date(u.lockedUntil) > new Date() && <Badge variant="warning" className="ml-2">Bloqueado</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right flex gap-2 justify-end">
                        {u.isActive ? (
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => revokeUser.mutate(u.id)}>Suspender</Button>
                        ) : (
                          <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700" onClick={() => activateUser.mutate(u.id)}>Activar</Button>
                        )}
                        {u.lockedUntil && <Button size="sm" variant="outline" onClick={() => unlockUser.mutate(u.id)}>Desbloquear</Button>}
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
