"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  ChevronLeft,
  Shirt,
  Package,
  Layers,
  Calendar,
  Tag,
  Info,
  Clock,
} from "lucide-react";
import Image from "next/image";
import { fetchPrendaDetalle } from "../catalogo-prendas.service";
import type { Prenda } from "../types";

export default function PrendaDetailPage() {
  const pathParams = useParams();
  const id = pathParams.id as string;

  const { data: prenda, isLoading, error } = useQuery<Prenda>({
    queryKey: ["catalogo-prenda-detalle", id],
    queryFn: () => fetchPrendaDetalle(id),
    enabled: !!id,
  });

  const totalStock = prenda?.variantes.reduce((acc, v) => acc + v.stock, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Botón de retroceso */}
      <div className="flex items-center">
        <Link href="/catalogo-prendas">
          <Button
            variant="ghost"
            className="rounded-full text-slate-600 hover:text-slate-900 flex items-center gap-1 px-4 py-2 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al Catálogo</span>
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Card className="border-none shadow-md bg-white rounded-3xl p-12 text-center text-slate-500 font-medium">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Cargando detalle de la prenda...</span>
          </div>
        </Card>
      ) : error || !prenda ? (
        <Card className="border-none shadow-md bg-white rounded-3xl p-12 text-center text-slate-400">
          <Info className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-800 text-lg">
            No se pudo cargar el detalle
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Es posible que la prenda no exista o que haya un problema de conexión.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Información de Prenda y Foto */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Imagen del Producto */}
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/60 relative flex items-center justify-center">
                  <Image
                    src={prenda.imagenUrl}
                    alt={prenda.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="object-contain p-2"
                    unoptimized
                  />
                </div>

                {/* Info General */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-slate-600 border-slate-200 px-3 py-1 text-xs"
                    >
                      {prenda.categoria}
                    </Badge>
                    {prenda.activo ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium px-3 py-1 text-xs rounded-full">
                        Activo
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-50 text-rose-700 border border-rose-200/60 font-medium px-3 py-1 text-xs rounded-full">
                        Inactivo
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
                    {prenda.nombre}
                  </h1>

                  <p className="text-sm text-slate-500 whitespace-pre-line leading-relaxed">
                    {prenda.descripcion || "Sin descripción registrada."}
                  </p>
                </div>
              </div>
            </Card>

            {/* Ficha Técnica */}
            <Card className="border-none shadow-md bg-white rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                <Tag className="w-4 h-4 text-blue-500" />
                <span>Atributos Base</span>
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Precio Base</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(prenda.precioBase)}
                  </span>
                </div>
                {prenda.fiberComposition && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">Composición</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {prenda.fiberComposition}
                    </span>
                  </div>
                )}
                {prenda.careInstructions && (
                  <div className="py-1">
                    <span className="text-slate-400 block mb-1">Cuidado</span>
                    <span className="font-medium text-slate-700 text-xs block bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                      {prenda.careInstructions}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Actualizado: {new Date(prenda.updatedAt).toLocaleDateString("es-PE")}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Columna Derecha: Tabla de Variantes e Inventario */}
          <div className="lg:col-span-2 space-y-6">
            {/* KPI de Existencias */}
            <Card className="border-none shadow-md bg-white rounded-3xl p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Existencias Totales
                </p>
                <p className="text-3xl font-extrabold text-slate-900">
                  {totalStock} <span className="text-sm font-medium text-slate-500">unidades</span>
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/50">
                <Package className="w-6 h-6" />
              </div>
            </Card>

            {/* Tabla de Variantes */}
            <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Existencias por Variante
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Detalle desglosado por combinación de Talla y Color
                  </p>
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  {prenda.variantes.length} combinaciones
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {prenda.variantes.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Shirt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-500">
                      Sin variantes registradas
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      No hay inventario configurado para esta prenda base.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Talla</th>
                          <th className="px-6 py-4 font-semibold">Color</th>
                          <th className="px-6 py-4 font-semibold">Existencias</th>
                          <th className="px-6 py-4 font-semibold text-right">Precio Unitario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prenda.variantes.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {v.talla}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-slate-200/80 shadow-sm shrink-0"
                                  style={{ backgroundColor: v.colorHex }}
                                />
                                <span className="text-slate-600 font-medium">{v.color}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={
                                  v.stock === 0
                                    ? "text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full text-xs"
                                    : "text-slate-700 font-semibold"
                                }
                              >
                                {v.stock === 0 ? "Agotado" : `${v.stock} unidades`}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-700">
                              {v.precio ? formatCurrency(v.precio) : formatCurrency(prenda.precioBase)}
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
        </div>
      )}
    </div>
  );
}
