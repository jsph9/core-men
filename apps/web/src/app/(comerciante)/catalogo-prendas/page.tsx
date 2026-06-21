"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Edit3,
  PowerOff,
  Shirt,
  Package,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import Image from "next/image";
import {
  fetchPrendas,
  fetchPrendaDetalle,
  crearPrenda,
  editarPrenda,
  desactivarPrenda,
  fetchAtributos,
} from "./catalogo-prendas.service";
import type { Prenda, CategoriaAtributo } from "./types";

const ITEMS_PER_PAGE = 8;

export default function CatalogoPrendasPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("Todos");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [confirmDesactivarId, setConfirmDesactivarId] = useState<string | null>(null);
  const [editingPrenda, setEditingPrenda] = useState<Prenda | null>(null);
  const [selectedPrendaId, setSelectedPrendaId] = useState<string | null>(null);

  // Form state
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formCategoriaId, setFormCategoriaId] = useState("");
  const [formPrecioBase, setFormPrecioBase] = useState("");
  const [formImagenUrl, setFormImagenUrl] = useState("");
  const [formActivo, setFormActivo] = useState(true);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: prendas = [], isLoading } = useQuery<Prenda[]>({
    queryKey: ["merchant-catalogo-prendas"],
    queryFn: fetchPrendas,
  });

  const { data: atributos } = useQuery({
    queryKey: ["admin-attributes"],
    queryFn: fetchAtributos,
  });

  const { data: prendaDetalle, isLoading: isLoadingDetalle } = useQuery<Prenda>({
    queryKey: ["catalogo-prenda-detalle", selectedPrendaId],
    queryFn: () => fetchPrendaDetalle(selectedPrendaId!),
    enabled: !!selectedPrendaId && detalleOpen,
  });

  const categorias: CategoriaAtributo[] = atributos?.categories ?? [];

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: crearPrenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-catalogo-prendas"] });
      toast.success("Prenda registrada exitosamente.");
      setFormOpen(false);
    },
    onError: (err: any) =>
      toast.error("Error al registrar prenda", { description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof editarPrenda>[1];
    }) => editarPrenda(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-catalogo-prendas"] });
      toast.success("Prenda actualizada correctamente.");
      setFormOpen(false);
    },
    onError: (err: any) =>
      toast.error("Error al actualizar prenda", { description: err.message }),
  });

  const desactivarMutation = useMutation({
    mutationFn: desactivarPrenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-catalogo-prendas"] });
      toast.success("Prenda desactivada correctamente.");
      setConfirmDesactivarId(null);
    },
    onError: (err: any) =>
      toast.error("Error al desactivar prenda", { description: err.message }),
  });

  // ─── Filtrado + paginación (frontend) ─────────────────────────────────────

  const filtered = useMemo(() => {
    return prendas.filter((p) => {
      const matchSearch =
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria =
        categoriaFilter === "Todos" || p.categoria === categoriaFilter;
      const matchEstado =
        estadoFilter === "Todos" ||
        (estadoFilter === "Activo" && p.activo) ||
        (estadoFilter === "Inactivo" && !p.activo);
      return matchSearch && matchCategoria && matchEstado;
    });
  }, [prendas, searchTerm, categoriaFilter, estadoFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueCategorias = useMemo(() => {
    const set = new Set(prendas.map((p) => p.categoria).filter(Boolean));
    return Array.from(set);
  }, [prendas]);

  const resetPage = () => setCurrentPage(1);

  // ─── Form handlers ────────────────────────────────────────────────────────

  const handleOpenForm = (prenda: Prenda | null = null) => {
    if (prenda) {
      setEditingPrenda(prenda);
      setFormNombre(prenda.nombre);
      setFormDescripcion(prenda.descripcion);
      setFormCategoriaId(
        prenda.categoriaId ??
          categorias.find((c) => c.name === prenda.categoria)?.id ??
          ""
      );
      setFormPrecioBase(String(prenda.precioBase));
      setFormImagenUrl(prenda.imagenUrl);
      setFormActivo(prenda.activo);
    } else {
      setEditingPrenda(null);
      setFormNombre("");
      setFormDescripcion("");
      setFormCategoriaId(categorias[0]?.id ?? "");
      setFormPrecioBase("");
      setFormImagenUrl("");
      setFormActivo(true);
    }
    setFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseFloat(formPrecioBase);
    if (isNaN(precio) || precio <= 0) {
      toast.error("El precio base debe ser un número mayor a 0.");
      return;
    }
    if (!formCategoriaId) {
      toast.error("Selecciona una categoría.");
      return;
    }

    if (editingPrenda) {
      updateMutation.mutate({
        id: editingPrenda.id,
        payload: {
          nombre: formNombre,
          descripcion: formDescripcion,
          categoriaId: formCategoriaId,
          precioBase: precio,
          imagenUrl: formImagenUrl,
          activo: formActivo,
          fabricId: editingPrenda.fabricId ?? "",
          fiberComposition: editingPrenda.fiberComposition ?? "100% Algodón",
          careInstructions:
            editingPrenda.careInstructions ??
            "Lavar a máquina en frío con colores similares",
        },
      });
    } else {
      createMutation.mutate({
        nombre: formNombre,
        descripcion: formDescripcion,
        categoriaId: formCategoriaId,
        precioBase: precio,
        imagenUrl: formImagenUrl,
        activo: formActivo,
      });
    }
  };

  const handleVerDetalle = (prenda: Prenda) => {
    setSelectedPrendaId(prenda.id);
    setDetalleOpen(true);
  };

  const totalStock = (prenda: Prenda) =>
    (prendaDetalle?.id === prenda.id ? prendaDetalle : prenda).variantes.reduce(
      (acc, v) => acc + v.stock,
      0
    );

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    desactivarMutation.isPending;

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Catálogo de Prendas
          </h2>
          <p className="text-slate-500 text-sm">
            Gestiona las prendas y variantes disponibles en tu catálogo.
          </p>
        </div>
        <Button
          onClick={() => handleOpenForm()}
          className="bg-blue-600 hover:bg-blue-700 rounded-full flex items-center gap-1.5 px-5 self-start"
        >
          <Plus className="w-4 h-4" /> Registrar Prenda
        </Button>
      </div>

      {/* Main Card */}
      <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
        {/* Search + Filters */}
        <CardHeader className="border-b border-slate-100 p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetPage();
                }}
                className="pl-10 rounded-full border-slate-200 focus-visible:ring-blue-600"
              />
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 self-start sm:self-auto font-medium">
              <Shirt className="w-3.5 h-3.5" /> Total: {prendas.length} prendas
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Filter className="w-3.5 h-3.5" /> Filtros:
            </div>
            <select
              value={categoriaFilter}
              onChange={(e) => {
                setCategoriaFilter(e.target.value);
                resetPage();
              }}
              className="h-8 px-3 rounded-full border border-slate-200 text-slate-700 text-xs focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="Todos">Todas las categorías</option>
              {uniqueCategorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value);
                resetPage();
              }}
              className="h-8 px-3 rounded-full border border-slate-200 text-slate-700 text-xs focus:border-blue-500 focus:outline-none bg-white"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            {(categoriaFilter !== "Todos" ||
              estadoFilter !== "Todos" ||
              searchTerm) && (
              <button
                onClick={() => {
                  setCategoriaFilter("Todos");
                  setEstadoFilter("Todos");
                  setSearchTerm("");
                  resetPage();
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-medium">
              Cargando catálogo de prendas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Shirt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-800">
                No se encontraron prendas
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Prueba a buscar con otros términos o ajusta los filtros.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Imagen</th>
                      <th className="px-6 py-4 font-semibold">Nombre</th>
                      <th className="px-6 py-4 font-semibold">Categoría</th>
                      <th className="px-6 py-4 font-semibold">Precio Base</th>
                      <th className="px-6 py-4 font-semibold">Variantes</th>
                      <th className="px-6 py-4 font-semibold">Stock Total</th>
                      <th className="px-6 py-4 font-semibold">Estado</th>
                      <th className="px-6 py-4 font-semibold">Actualización</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((prenda) => (
                      <tr
                        key={prenda.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            <Image
                              src={prenda.imagenUrl}
                              alt={prenda.nombre}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                              unoptimized
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {prenda.nombre}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className="bg-white text-slate-600 border-slate-200"
                          >
                            {prenda.categoria}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">
                          {formatCurrency(prenda.precioBase)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            {prenda.variantes.length}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            {prenda.variantes.reduce(
                              (acc, v) => acc + v.stock,
                              0
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {prenda.activo ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none">
                              Activo
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 border-none">
                              Inactivo
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {formatDate(prenda.updatedAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full"
                              onClick={() => handleVerDetalle(prenda)}
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                              onClick={() => handleOpenForm(prenda)}
                              title="Editar prenda"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            {prenda.activo && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                                onClick={() =>
                                  setConfirmDesactivarId(prenda.id)
                                }
                                title="Desactivar prenda"
                              >
                                <PowerOff className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Mostrando{" "}
                    {Math.min(
                      (currentPage - 1) * ITEMS_PER_PAGE + 1,
                      filtered.length
                    )}{" "}
                    –{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de{" "}
                    {filtered.length} prendas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-semibold text-slate-700">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear / Editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-3xl border-none shadow-lg max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingPrenda ? "Editar Prenda" : "Registrar Nueva Prenda"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="font-semibold text-slate-700">
                Nombre
              </Label>
              <Input
                id="nombre"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                placeholder="Ej. Polo Clásico Manga Corta"
                required
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="descripcion"
                className="font-semibold text-slate-700"
              >
                Descripción
              </Label>
              <Textarea
                id="descripcion"
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                placeholder="Breve descripción de la prenda..."
                rows={3}
                className="rounded-xl border-slate-200 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="categoria"
                  className="font-semibold text-slate-700"
                >
                  Categoría
                </Label>
                <select
                  id="categoria"
                  value={formCategoriaId}
                  onChange={(e) => setFormCategoriaId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="precioBase"
                  className="font-semibold text-slate-700"
                >
                  Precio Base (S/)
                </Label>
                <Input
                  id="precioBase"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formPrecioBase}
                  onChange={(e) => setFormPrecioBase(e.target.value)}
                  placeholder="0.00"
                  required
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="imagenUrl"
                className="font-semibold text-slate-700"
              >
                URL de imagen
              </Label>
              <Input
                id="imagenUrl"
                value={formImagenUrl}
                onChange={(e) => setFormImagenUrl(e.target.value)}
                placeholder="https://... o /prenda-base.png"
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="formActivo"
                className="font-semibold text-slate-700"
              >
                Estado
              </Label>
              <select
                id="formActivo"
                value={formActivo ? "true" : "false"}
                onChange={(e) => setFormActivo(e.target.value === "true")}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-6"
                onClick={() => setFormOpen(false)}
                disabled={isMutating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 text-white"
                disabled={isMutating}
              >
                {isMutating
                  ? "Guardando..."
                  : editingPrenda
                  ? "Guardar Cambios"
                  : "Registrar Prenda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle */}
      <Dialog
        open={detalleOpen}
        onOpenChange={(open) => {
          setDetalleOpen(open);
          if (!open) setSelectedPrendaId(null);
        }}
      >
        <DialogContent className="rounded-3xl border-none shadow-lg max-w-xl bg-white">
          {isLoadingDetalle ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              Cargando detalle...
            </div>
          ) : prendaDetalle ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {prendaDetalle.nombre}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {/* Image + General Info */}
                <div className="flex gap-5">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <Image
                      src={prendaDetalle.imagenUrl}
                      alt={prendaDetalle.nombre}
                      width={112}
                      height={112}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-white text-slate-600 border-slate-200"
                      >
                        {prendaDetalle.categoria}
                      </Badge>
                      {prendaDetalle.activo ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-none">
                          Activo
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-none">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {prendaDetalle.descripcion || "Sin descripción."}
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(prendaDetalle.precioBase)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Actualizado:{" "}
                      {new Date(prendaDetalle.updatedAt).toLocaleDateString(
                        "es-PE"
                      )}
                    </p>
                  </div>
                </div>

                {/* Variantes */}
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-3">
                    Variantes ({prendaDetalle.variantes.length})
                  </p>
                  {prendaDetalle.variantes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Esta prenda no tiene variantes registradas.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Talla</th>
                            <th className="px-4 py-2 font-semibold">Color</th>
                            <th className="px-4 py-2 font-semibold">Stock</th>
                            <th className="px-4 py-2 font-semibold">Precio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prendaDetalle.variantes.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-medium text-slate-800">
                                {v.talla}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-3 h-3 rounded-full border border-slate-200"
                                    style={{ backgroundColor: v.colorHex }}
                                  />
                                  <span className="text-slate-600">
                                    {v.color}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={
                                    v.stock === 0
                                      ? "text-rose-600 font-semibold"
                                      : "text-slate-700"
                                  }
                                >
                                  {v.stock}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-700">
                                {v.precio
                                  ? formatCurrency(v.precio)
                                  : "— Base"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {prendaDetalle.variantes.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2">
                      Stock total:{" "}
                      <span className="font-semibold text-slate-700">
                        {prendaDetalle.variantes.reduce(
                          (acc, v) => acc + v.stock,
                          0
                        )}{" "}
                        unidades
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-full px-6"
                  onClick={() => {
                    setDetalleOpen(false);
                    setSelectedPrendaId(null);
                  }}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Desactivar */}
      <Dialog
        open={!!confirmDesactivarId}
        onOpenChange={() => setConfirmDesactivarId(null)}
      >
        <DialogContent className="rounded-3xl border-none shadow-lg max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              ¿Desactivar esta prenda?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 py-2">
            La prenda pasará a estado <strong>Inactivo</strong> y no será
            visible para los clientes. Podrás reactivarla editando la prenda en
            cualquier momento.
          </p>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-full px-6"
              onClick={() => setConfirmDesactivarId(null)}
              disabled={desactivarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 rounded-full px-6 text-white"
              disabled={desactivarMutation.isPending}
              onClick={() =>
                confirmDesactivarId &&
                desactivarMutation.mutate(confirmDesactivarId)
              }
            >
              {desactivarMutation.isPending ? "Desactivando..." : "Sí, desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
