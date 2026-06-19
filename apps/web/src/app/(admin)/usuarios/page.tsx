"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Search, 
  ShieldAlert, 
  Edit3, 
  UserCheck, 
  UserX, 
  Lock, 
  Unlock, 
  Mail, 
  Key, 
  UserCircle 
} from "lucide-react";

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Queries
  const { data: users, isLoading } = useQuery<any[]>({ 
    queryKey: ["admin-users"], 
    queryFn: () => apiGet("/api/admin/users") 
  });

  // Mutations
  const createUser = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuario creado exitosamente");
      setUserOpen(false);
    },
    onError: (err: any) => toast.error("Error al crear usuario", { description: err.message }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: any) => apiPatch(`/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuario actualizado correctamente");
      setUserOpen(false);
    },
    onError: (err: any) => toast.error("Error al actualizar usuario", { description: err.message }),
  });

  const revokeUser = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/admin/users/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuario suspendido");
    },
    onError: (err: any) => toast.error("Error al suspender", { description: err.message }),
  });

  const unlockUser = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/admin/users/${id}/unlock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Cuenta desbloqueada");
    },
    onError: (err: any) => toast.error("Error al desbloquear", { description: err.message }),
  });

  const activateUser = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/admin/users/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuario activado");
    },
    onError: (err: any) => toast.error("Error al activar", { description: err.message }),
  });

  // States
  const [userOpen, setUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userMaternalLastName, setUserMaternalLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("CLIENT");
  const [userActive, setUserActive] = useState(true);

  // Form Handlers
  const handleOpenUser = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setUserFirstName(user.firstName || "");
      setUserLastName(user.lastName || "");
      setUserMaternalLastName(user.maternalLastName || "");
      setUserEmail(user.email || "");
      setUserPassword(""); // Don't show hashed password
      setUserRole(user.role || "CLIENT");
      setUserActive(user.isActive);
    } else {
      setEditingUser(null);
      setUserFirstName("");
      setUserLastName("");
      setUserMaternalLastName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("CLIENT");
      setUserActive(true);
    }
    setUserOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      firstName: userFirstName,
      lastName: userLastName,
      maternalLastName: userMaternalLastName || null,
      email: userEmail,
      role: userRole,
      isActive: userActive,
    };
    if (userPassword) {
      data.password = userPassword;
    }

    if (editingUser) {
      updateUser.mutate({ id: editingUser.id, data });
    } else {
      createUser.mutate(data);
    }
  };

  // Filter users by search term
  const filteredUsers = users?.filter(
    (u: any) =>
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.maternalLastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Gestión de Usuarios</h2>
          <p className="text-slate-500 text-sm">Controla las cuentas de clientes, comerciantes y administradores en la plataforma.</p>
        </div>
        <Button onClick={() => handleOpenUser()} className="bg-blue-600 hover:bg-blue-700 rounded-full flex items-center gap-1.5 px-5 self-start">
          <Plus className="w-4 h-4" /> Registrar Usuario
        </Button>
      </div>

      {/* Main card */}
      <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
        {/* Search and Filters */}
        <CardHeader className="border-b border-slate-100 p-6 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Buscar por nombre, correo electrónico o rol..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 rounded-full border-slate-200 focus-visible:ring-blue-600"
            />
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 self-start sm:self-auto font-medium">
            <Users className="w-3.5 h-3.5" /> Total usuarios: {users?.length || 0}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-medium">Cargando catálogo de usuarios...</div>
          ) : !filteredUsers.length ? (
            <div className="p-16 text-center text-slate-400">
              <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-400" />
              <p className="font-semibold text-slate-800">No se encontraron usuarios</p>
              <p className="text-xs text-slate-400 mt-1">Prueba a buscar con otros términos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nombre</th>
                    <th className="px-6 py-4 font-semibold">Correo Electrónico</th>
                    <th className="px-6 py-4 font-semibold">Rol asignado</th>
                    <th className="px-6 py-4 font-semibold">Estado</th>
                    <th className="px-6 py-4 font-semibold">Creado</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u: any) => {
                    const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
                    
                    const getRoleBadge = (role: string) => {
                      if (role === "ADMIN") return <Badge className="bg-blue-100 text-blue-800 border-none font-bold">ADMIN</Badge>;
                      if (role === "MERCHANT") return <Badge className="bg-purple-100 text-purple-800 border-none font-bold">MERCHANT</Badge>;
                      return <Badge variant="outline" className="bg-white text-slate-600 font-semibold border-slate-200">CLIENT</Badge>;
                    };

                    const fullName = `${u.firstName || ""} ${u.lastName || ""} ${u.maternalLastName || ""}`.trim();
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                              {u.firstName ? u.firstName[0].toUpperCase() : "?"}
                            </div>
                            <span className="truncate max-w-[180px]" title={fullName}>{fullName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{u.email}</td>
                        <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            {u.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-none">Activo</Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 border-none">Suspendido</Badge>
                            )}
                            {isLocked && (
                              <Badge className="bg-amber-100 text-amber-800 border-none flex items-center gap-1 text-[10px]">
                                <Lock className="w-2.5 h-2.5" /> Bloqueado
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right flex gap-1 justify-end items-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full" onClick={() => handleOpenUser(u)} title="Editar detalles">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          {isLocked && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-full" onClick={() => unlockUser.mutate(u.id)} title="Desbloquear cuenta">
                              <Unlock className="w-4 h-4" />
                            </Button>
                          )}
                          {u.isActive ? (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full" onClick={() => revokeUser.mutate(u.id)} title="Suspender cuenta">
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-full" onClick={() => activateUser.mutate(u.id)} title="Activar cuenta">
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal User Creation / Editing */}
      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent className="rounded-3xl border-none shadow-lg max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingUser ? "Editar Usuario" : "Registrar Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userFirstName" className="font-semibold text-slate-700">Nombres</Label>
              <Input 
                id="userFirstName" 
                value={userFirstName} 
                onChange={(e) => setUserFirstName(e.target.value)} 
                placeholder="Ej. Juan" 
                required 
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userLastName" className="font-semibold text-slate-700">Ap. Paterno</Label>
                <Input 
                  id="userLastName" 
                  value={userLastName} 
                  onChange={(e) => setUserLastName(e.target.value)} 
                  placeholder="Pérez" 
                  required 
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userMaternalLastName" className="font-semibold text-slate-700">Ap. Materno</Label>
                <Input 
                  id="userMaternalLastName" 
                  value={userMaternalLastName} 
                  onChange={(e) => setUserMaternalLastName(e.target.value)} 
                  placeholder="Ramos" 
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail" className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> Correo Electrónico
              </Label>
              <Input 
                id="userEmail" 
                type="email"
                value={userEmail} 
                onChange={(e) => setUserEmail(e.target.value)} 
                placeholder="Ej. juan@coremen.pe" 
                required 
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPassword" className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Key className="w-4 h-4" /> Contraseña {editingUser && "(Dejar en blanco para no cambiar)"}
              </Label>
              <Input 
                id="userPassword" 
                type="password"
                value={userPassword} 
                onChange={(e) => setUserPassword(e.target.value)} 
                placeholder="Contraseña robusta" 
                required={!editingUser}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userRole" className="font-semibold text-slate-700">Rol del Usuario</Label>
                <select 
                  id="userRole" 
                  value={userRole} 
                  onChange={(e) => setUserRole(e.target.value)} 
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="CLIENT">Client (Cliente)</option>
                  <option value="MERCHANT">Merchant (Comerciante)</option>
                  <option value="ADMIN">Admin (Administrador)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userActive" className="font-semibold text-slate-700">Estado Inicial</Label>
                <select 
                  id="userActive" 
                  value={userActive ? "true" : "false"} 
                  onChange={(e) => setUserActive(e.target.value === "true")} 
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="true">Activo</option>
                  <option value="false">Suspendido</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-6 flex gap-2">
              <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setUserOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 text-white">
                {editingUser ? "Guardar Cambios" : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
