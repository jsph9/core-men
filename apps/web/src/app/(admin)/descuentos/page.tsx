"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
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
  PercentCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Tag, 
  Info, 
  Check, 
  AlertTriangle 
} from "lucide-react";

export default function DescuentosPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: volumeRules, isLoading: loadingVol } = useQuery<any[]>({
    queryKey: ["discounts-volume"],
    queryFn: () => apiGet("/api/admin/discounts/volume"),
  });
  const { data: seasonDiscounts, isLoading: loadingSeason } = useQuery<any[]>({
    queryKey: ["discounts-season"],
    queryFn: () => apiGet("/api/admin/discounts/season"),
  });
  const { data: attributes } = useQuery<any>({
    queryKey: ["admin-attributes"],
    queryFn: () => apiGet("/api/admin/attributes?includeInactive=true"),
  });

  const categories = attributes?.categories || [];

  // Mutations
  const createVolRule = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/discounts/volume", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts-volume"] });
      toast.success("Regla de volumen creada");
      setVolOpen(false);
    },
    onError: (err: any) => toast.error("Error al crear", { description: err.message }),
  });

  const updateVolRule = useMutation({
    mutationFn: ({ id, data }: any) => apiPatch(`/api/admin/discounts/volume/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts-volume"] });
      toast.success("Regla de volumen actualizada");
      setVolOpen(false);
    },
    onError: (err: any) => toast.error("Error al actualizar", { description: err.message }),
  });

  const deleteVolRule = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/discounts/volume/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts-volume"] });
      toast.success("Regla de volumen eliminada");
    },
    onError: (err: any) => toast.error("Error al eliminar", { description: err.message }),
  });

  const createSeasonRule = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/discounts/season", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts-season"] });
      toast.success("Campaña de temporada creada");
      setSeasonOpen(false);
    },
    onError: (err: any) => toast.error("Error al crear", { description: err.message }),
  });

  const updateSeasonRule = useMutation({
    mutationFn: ({ id, data }: any) => apiPatch(`/api/admin/discounts/season/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts-season"] });
      toast.success("Campaña actualizada");
      setSeasonOpen(false);
    },
    onError: (err: any) => toast.error("Error al actualizar", { description: err.message }),
  });

  const deleteSeasonRule = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/discounts/season/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts-season"] });
      toast.success("Campaña eliminada");
    },
    onError: (err: any) => toast.error("Error al eliminar", { description: err.message }),
  });

  // State
  const [volOpen, setVolOpen] = useState(false);
  const [editingVol, setEditingVol] = useState<any>(null);
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [volPercentage, setVolPercentage] = useState("");
  const [volActive, setVolActive] = useState(true);

  const [seasonOpen, setSeasonOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [seasonName, setSeasonName] = useState("");
  const [seasonPercentage, setSeasonPercentage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAccumulative, setIsAccumulative] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [seasonStatus, setSeasonStatus] = useState("SCHEDULED");

  // Form Handlers
  const handleOpenVol = (rule: any = null) => {
    if (rule) {
      setEditingVol(rule);
      setMinQty(rule.minQuantity.toString());
      setMaxQty(rule.maxQuantity ? rule.maxQuantity.toString() : "");
      setVolPercentage(Number(rule.percentage).toString());
      setVolActive(rule.isActive);
    } else {
      setEditingVol(null);
      setMinQty("");
      setMaxQty("");
      setVolPercentage("");
      setVolActive(true);
    }
    setVolOpen(true);
  };

  const handleSaveVol = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      minQuantity: parseInt(minQty),
      maxQuantity: maxQty ? parseInt(maxQty) : null,
      percentage: parseFloat(volPercentage),
      isActive: volActive,
    };

    if (editingVol) {
      updateVolRule.mutate({ id: editingVol.id, data });
    } else {
      createVolRule.mutate(data);
    }
  };

  const handleOpenSeason = (camp: any = null) => {
    if (camp) {
      setEditingSeason(camp);
      setSeasonName(camp.name);
      setSeasonPercentage(Number(camp.percentage).toString());
      setStartDate(new Date(camp.startDate).toISOString().split("T")[0]);
      setEndDate(new Date(camp.endDate).toISOString().split("T")[0]);
      setIsAccumulative(camp.isAccumulative);
      setSelectedCats(camp.appliesTo || []);
      setSeasonStatus(camp.status);
    } else {
      setEditingSeason(null);
      setSeasonName("");
      setSeasonPercentage("");
      setStartDate("");
      setEndDate("");
      setIsAccumulative(false);
      setSelectedCats([]);
      setSeasonStatus("SCHEDULED");
    }
    setSeasonOpen(true);
  };

  const handleSaveSeason = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: seasonName,
      percentage: parseFloat(seasonPercentage),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isAccumulative,
      status: seasonStatus,
      appliesTo: selectedCats,
    };

    if (editingSeason) {
      updateSeasonRule.mutate({ id: editingSeason.id, data });
    } else {
      createSeasonRule.mutate(data);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const confirmDelete = (action: () => void) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar permanentemente esta regla de descuento?")) {
      action();
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview/Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Configuración de Descuentos</h2>
          <p className="text-slate-500 text-sm">Gestiona descuentos automáticos por volumen de compra y campañas de temporada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Card 1: Volume Discounts */}
        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <PercentCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Descuentos por Volumen</CardTitle>
                <p className="text-xs text-slate-500">Rangos aplicados según la cantidad por producto.</p>
              </div>
            </div>
            <Button onClick={() => handleOpenVol()} size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-full flex items-center gap-1.5 px-4">
              <Plus className="w-4 h-4" /> Agregar rango
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingVol ? (
              <p className="p-6 text-slate-500">Cargando reglas...</p>
            ) : !volumeRules?.length ? (
              <div className="p-12 text-center text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay reglas de volumen configuradas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Cant. Mínima</th>
                      <th className="px-6 py-4 font-semibold">Cant. Máxima</th>
                      <th className="px-6 py-4 font-semibold">Descuento</th>
                      <th className="px-6 py-4 font-semibold">Estado</th>
                      <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {volumeRules.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-700">{r.minQuantity} uds.</td>
                        <td className="px-6 py-4 text-slate-500">{r.maxQuantity ? `${r.maxQuantity} uds.` : "Sin límite (∞)"}</td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-blue-600 text-base">{Number(r.percentage)}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={r.isActive ? "success" : "destructive"} 
                            className={r.isActive ? "bg-emerald-100 text-emerald-800 border-none" : "bg-rose-100 text-rose-800 border-none"}
                          >
                            {r.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right flex gap-1 justify-end items-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full" onClick={() => handleOpenVol(r)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 rounded-full" onClick={() => confirmDelete(() => deleteVolRule.mutate(r.id))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Seasonal Campaigns */}
        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Campañas Temporales</CardTitle>
                <p className="text-xs text-slate-500">Descuentos activos en un periodo específico.</p>
              </div>
            </div>
            <Button onClick={() => handleOpenSeason()} size="sm" className="bg-purple-600 hover:bg-purple-700 rounded-full flex items-center gap-1.5 px-4">
              <Plus className="w-4 h-4" /> Crear campaña
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSeason ? (
              <p className="p-6 text-slate-500">Cargando campañas...</p>
            ) : !seasonDiscounts?.length ? (
              <div className="p-12 text-center text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay campañas de temporada configuradas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Campaña</th>
                      <th className="px-6 py-4 font-semibold">Descuento</th>
                      <th className="px-6 py-4 font-semibold">Vigencia</th>
                      <th className="px-6 py-4 font-semibold">Categorías</th>
                      <th className="px-6 py-4 font-semibold">Estado</th>
                      <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seasonDiscounts.map((s: any) => {
                      const getStatusBadge = (status: string) => {
                        if (status === "ACTIVE") return <Badge className="bg-emerald-100 text-emerald-800 border-none">Activa</Badge>;
                        if (status === "SCHEDULED") return <Badge className="bg-blue-100 text-blue-800 border-none">Programada</Badge>;
                        return <Badge className="bg-slate-100 text-slate-600 border-none">Expirada</Badge>;
                      };

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-800 leading-tight">{s.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {s.isAccumulative ? "Acumulable con volumen" : "Solo descuento mayor"}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-purple-600 text-base">{Number(s.percentage)}%</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs">
                            <p>Del {new Date(s.startDate).toLocaleDateString()}</p>
                            <p>al {new Date(s.endDate).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {!s.appliesTo?.length ? (
                                <Badge variant="outline" className="text-[10px] text-slate-400">Todas</Badge>
                              ) : (
                                s.appliesTo.map((catId: string) => {
                                  const name = categories.find((c: any) => c.id === catId)?.name || "Cat";
                                  return (
                                    <Badge key={catId} variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-none">
                                      {name}
                                    </Badge>
                                  );
                                })
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(s.status)}</td>
                          <td className="px-6 py-4 text-right flex gap-1 justify-end items-center">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full" onClick={() => handleOpenSeason(s)}>
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 rounded-full" onClick={() => confirmDelete(() => deleteSeasonRule.mutate(s.id))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
      </div>

      {/* Modal 1: Volume Discount Dialog */}
      <Dialog open={volOpen} onOpenChange={setVolOpen}>
        <DialogContent className="rounded-3xl border-none shadow-lg max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingVol ? "Editar Regla de Volumen" : "Nueva Regla de Volumen"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveVol} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minQty" className="font-semibold text-slate-700">Cant. Mínima (Unidades)</Label>
                <Input 
                  id="minQty" 
                  type="number" 
                  value={minQty} 
                  onChange={(e) => setMinQty(e.target.value)} 
                  placeholder="Ej. 12" 
                  required 
                  min="1"
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxQty" className="font-semibold text-slate-700">Cant. Máxima (Opcional)</Label>
                <Input 
                  id="maxQty" 
                  type="number" 
                  value={maxQty} 
                  onChange={(e) => setMaxQty(e.target.value)} 
                  placeholder="Ej. 24 (Vacío = ∞)" 
                  min="1"
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volPercentage" className="font-semibold text-slate-700">Porcentaje de Descuento (%)</Label>
              <Input 
                id="volPercentage" 
                type="number" 
                step="0.01" 
                value={volPercentage} 
                onChange={(e) => setVolPercentage(e.target.value)} 
                placeholder="Ej. 10.00" 
                required 
                min="0.1" 
                max="100"
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input 
                id="volActive" 
                type="checkbox" 
                checked={volActive} 
                onChange={(e) => setVolActive(e.target.checked)} 
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="volActive" className="font-semibold text-slate-700 cursor-pointer">
                Regla activa inmediatamente
              </Label>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setVolOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 text-white">
                {editingVol ? "Guardar Cambios" : "Crear Regla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Season Discount Dialog */}
      <Dialog open={seasonOpen} onOpenChange={setSeasonOpen}>
        <DialogContent className="rounded-3xl border-none shadow-lg max-w-lg bg-white overflow-hidden scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingSeason ? "Editar Campaña de Temporada" : "Nueva Campaña de Temporada"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSeason} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="seasonName" className="font-semibold text-slate-700">Nombre de la Campaña / Temporada</Label>
              <Input 
                id="seasonName" 
                value={seasonName} 
                onChange={(e) => setSeasonName(e.target.value)} 
                placeholder="Ej. Cyber Monday, Campaña de Invierno" 
                required 
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seasonPercentage" className="font-semibold text-slate-700">Descuento (%)</Label>
                <Input 
                  id="seasonPercentage" 
                  type="number" 
                  step="0.01" 
                  value={seasonPercentage} 
                  onChange={(e) => setSeasonPercentage(e.target.value)} 
                  placeholder="Ej. 15.00" 
                  required 
                  min="0.1" 
                  max="100"
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seasonStatus" className="font-semibold text-slate-700">Estado de la Campaña</Label>
                <select 
                  id="seasonStatus" 
                  value={seasonStatus} 
                  onChange={(e) => setSeasonStatus(e.target.value)} 
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="SCHEDULED">Programada (Inactiva)</option>
                  <option value="ACTIVE">Activa (Vigente)</option>
                  <option value="EXPIRED">Expirada (Desactivada)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="font-semibold text-slate-700">Fecha de Inicio</Label>
                <Input 
                  id="startDate" 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  required 
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="font-semibold text-slate-700">Fecha de Fin</Label>
                <Input 
                  id="endDate" 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  required 
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input 
                id="isAccumulative" 
                type="checkbox" 
                checked={isAccumulative} 
                onChange={(e) => setIsAccumulative(e.target.checked)} 
                className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
              />
              <Label htmlFor="isAccumulative" className="font-semibold text-slate-700 cursor-pointer">
                Acumulable con descuentos por volumen
              </Label>
            </div>

            {/* Category selection */}
            <div className="space-y-2 pt-2">
              <Label className="font-semibold text-slate-700 flex items-center gap-1">
                <Tag className="w-4 h-4" /> Aplicable a categorías específicas (Vacío = todas)
              </Label>
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {categories.map((cat: any) => {
                  const selected = selectedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                        selected 
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setSeasonOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 rounded-full px-6 text-white">
                {editingSeason ? "Guardar Campaña" : "Crear Campaña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
