"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Search,
  Shirt,
  Package,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  fetchPrendas,
  fetchAtributos,
} from "./catalogo-prendas.service";
import type { Prenda, CategoriaAtributo } from "./types";

const ITEMS_PER_PAGE = 8;

export default function CatalogoPrendasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("Todos");
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: prendas = [], isLoading } = useQuery<Prenda[]>({
    queryKey: ["merchant-catalogo-prendas"],
    queryFn: fetchPrendas,
  });

  const { data: atributos } = useQuery({
    queryKey: ["admin-attributes"],
    queryFn: fetchAtributos,
  });

  const categorias: CategoriaAtributo[] = atributos?.categories ?? [];

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
            Consulta las prendas, variantes y existencias disponibles en tu catálogo.
          </p>
        </div>
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
                          <div className="flex items-center justify-end">
                            <Link href={`/catalogo-prendas/${prenda.id}`}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-full"
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
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

    </div>
  );
}
