"use client";
import { useState, useMemo, useEffect } from "react";
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
  Sparkles,
  HelpCircle,
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

  // Estado para la imagen activa
  const [activeImageUrl, setActiveImageUrl] = useState<string>("");

  // Estado para filtros interactivos de variante
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Inicializar la imagen activa una vez cargados los datos
  useEffect(() => {
    if (prenda?.imagenUrl) {
      setActiveImageUrl(prenda.imagenUrl);
    }
  }, [prenda]);

  // Lista de imágenes (imagen principal + secundarias si las hay)
  const allImages = useMemo(() => {
    if (!prenda) return [];
    const imgs = prenda.images ?? [];
    if (imgs.length === 0 || !imgs.includes(prenda.imagenUrl)) {
      return [prenda.imagenUrl, ...imgs.filter((img) => img !== prenda.imagenUrl)];
    }
    return imgs;
  }, [prenda]);

  // Obtener colores únicos disponibles
  const uniqueColors = useMemo(() => {
    if (!prenda) return [];
    const unique = new Map<string, { color: string; colorHex: string }>();
    prenda.variantes.forEach((v) => {
      unique.set(v.color, { color: v.color, colorHex: v.colorHex });
    });
    return Array.from(unique.values());
  }, [prenda]);

  // Obtener tallas únicas disponibles
  const uniqueSizes = useMemo(() => {
    if (!prenda) return [];
    const unique = new Set(prenda.variantes.map((v) => v.talla));
    return Array.from(unique);
  }, [prenda]);

  // Filtrar variantes mostradas en la tabla según selección
  const filteredVariantes = useMemo(() => {
    if (!prenda) return [];
    return prenda.variantes.filter((v) => {
      const matchColor = !selectedColor || v.color === selectedColor;
      const matchSize = !selectedSize || v.talla === selectedSize;
      return matchColor && matchSize;
    });
  }, [prenda, selectedColor, selectedSize]);

  const totalStock = prenda?.variantes.reduce((acc, v) => acc + v.stock, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 pb-12">
      {/* Botón de retroceso */}
      <div className="flex items-center">
        <Link href="/catalogo-prendas">
          <Button
            variant="ghost"
            className="rounded-full text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-4 py-2 hover:bg-slate-100 transition-colors"
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
        <div className="space-y-8">
          {/* Ficha Principal de Producto */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Sección de Imagen y Galería (Izquierda) */}
            <div className="md:col-span-5 space-y-4">
              <div className="w-full aspect-square rounded-3xl overflow-hidden bg-slate-50 border border-slate-150 relative flex items-center justify-center shadow-sm">
                <Image
                  src={activeImageUrl || prenda.imagenUrl}
                  alt={prenda.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, 450px"
                  className="object-contain p-4"
                  priority
                  unoptimized
                />

                {/* Badge de Tela Base sobre la imagen (Top-Left) */}
                {prenda.fabric && (
                  <Badge className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white border border-slate-200/50 shadow-sm rounded-full px-3 py-1 font-semibold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {prenda.fabric}
                  </Badge>
                )}
              </div>

              {/* Miniaturas de Galería con etiquetas de vista */}
              {allImages.length > 1 && (
                <div className="flex flex-wrap gap-3">
                  {allImages.map((imgUrl, index) => {
                    const isActive = imgUrl === activeImageUrl;
                    const viewLabels = ["Frontal", "Posterior", "Derecha", "Izquierda"];
                    const label = viewLabels[index] ?? `Vista ${index + 1}`;
                    return (
                      <button
                        key={index}
                        onClick={() => setActiveImageUrl(imgUrl)}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className={`w-16 h-16 rounded-xl overflow-hidden bg-white border-2 transition-all relative shrink-0 ${
                            isActive
                              ? "border-blue-600 shadow-sm ring-2 ring-blue-100"
                              : "border-slate-200 group-hover:border-slate-400"
                          }`}
                        >
                          <Image
                            src={imgUrl}
                            alt={label}
                            fill
                            sizes="64px"
                            className="object-contain p-1"
                            unoptimized
                          />
                        </div>
                        <span
                          className={`text-[10px] font-semibold transition-colors ${
                            isActive
                              ? "text-blue-600"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Información del Producto (Derecha) */}
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    {prenda.categoria}
                  </span>
                  {prenda.activo ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold px-2.5 py-0.5 rounded-full text-xs">
                      Activo
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-700 border border-rose-200/60 font-semibold px-2.5 py-0.5 rounded-full text-xs">
                      Inactivo
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                  {prenda.nombre}
                </h1>

                <div className="text-2xl font-black text-blue-600 pt-1">
                  {formatCurrency(prenda.precioBase)}
                </div>

                {prenda.descripcion && (
                  <p className="text-sm text-slate-500 leading-relaxed pt-2">
                    {prenda.descripcion}
                  </p>
                )}
              </div>

              {/* Selector Visual de Colores */}
              {uniqueColors.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">
                      Color
                    </span>
                    {selectedColor && (
                      <button
                        onClick={() => setSelectedColor(null)}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueColors.map((colorObj) => {
                      const isSelected = selectedColor === colorObj.color;
                      return (
                        <button
                          key={colorObj.color}
                          onClick={() =>
                            setSelectedColor(isSelected ? null : colorObj.color)
                          }
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: colorObj.colorHex }}
                          />
                          <span>{colorObj.color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selector Visual de Tallas */}
              {uniqueSizes.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">
                      Talla
                    </span>
                    <div className="flex items-center gap-3">
                      {selectedSize && (
                        <button
                          onClick={() => setSelectedSize(null)}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Limpiar selección
                        </button>
                      )}
                      <button className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> Guía de tallas
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueSizes.map((talla) => {
                      const isSelected = selectedSize === talla;
                      return (
                        <button
                          key={talla}
                          onClick={() =>
                            setSelectedSize(isSelected ? null : talla)
                          }
                          className={`min-w-[3.5rem] h-10 px-3 flex items-center justify-center rounded-xl border text-xs font-bold transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                          }`}
                        >
                          {talla}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ficha Técnica Reestructurada en Grid (4 Cuadrantes) */}
              <div className="space-y-3 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ficha Técnica
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-50/75 p-5 rounded-2xl border border-slate-100">
                  {/* Composición */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Composición
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {prenda.fiberComposition || "Sin especificar"}
                    </p>
                  </div>

                  {/* Cuidado */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cuidado
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {prenda.careInstructions || "Lavar según etiqueta"}
                    </p>
                  </div>

                  {/* Tela Base */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Tela Base
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {prenda.fabric || "Sin especificar"}
                    </p>
                  </div>

                  {/* Categoría */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Categoría
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {prenda.categoria}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sección Inferior: Inventario y existencias detalladas */}
          <div className="space-y-4 border-t border-slate-100 pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <span>Existencias en Almacén</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lista detallada del stock físico disponible por cada combinación.
                </p>
              </div>

              {/* Total Stock KPI */}
              <div className="flex items-center gap-3 bg-blue-50/60 border border-blue-100/50 rounded-2xl px-5 py-3 self-start sm:self-auto">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70">
                    Stock Físico Total
                  </p>
                  <p className="text-xl font-extrabold text-blue-900">
                    {totalStock} <span className="text-xs font-semibold text-blue-700">unidades</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla de Variantes con Filtro Reactivo */}
            <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {selectedColor || selectedSize ? "Variantes Filtradas" : "Todas las Variantes"}
                  </h4>
                  {(selectedColor || selectedSize) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Filtros activos: {selectedColor && `Color: ${selectedColor}`} {selectedSize && `Talla: ${selectedSize}`}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-medium">
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  {filteredVariantes.length} combinaciones
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {filteredVariantes.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Shirt className="w-10 h-10 mx-auto mb-2 opacity-35" />
                    <p className="font-semibold text-slate-800">
                      Sin stock o combinaciones
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      No hay inventario que coincida con los filtros seleccionados.
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
                          <th className="px-6 py-4 text-right font-semibold">Precio Unitario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredVariantes.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-extrabold text-slate-800">
                              {v.talla}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-4 h-4 rounded-full border border-black/10 shadow-sm shrink-0"
                                  style={{ backgroundColor: v.colorHex }}
                                />
                                <span className="text-slate-600 font-medium">{v.color}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                                  v.stock === 0
                                    ? "text-rose-700 bg-rose-50 border-rose-100/60"
                                    : v.stock <= 5
                                    ? "text-amber-700 bg-amber-50 border-amber-100/60"
                                    : "text-slate-700 bg-slate-50 border-slate-150"
                                }`}
                              >
                                {v.stock === 0 ? "Agotado" : `${v.stock} unidades`}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-slate-800">
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
