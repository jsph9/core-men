"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  Save, 
  AlertTriangle,
  Loader2,
  FileText,
  Banknote,
  Calendar,
  Layers,
  Settings,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Shirt
} from "lucide-react";

const formatPrice = (p: number | string) => {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(p));
};

const getProductColorsAndSizes = (variants: any[]) => {
  if (!variants) return { colors: [], sizes: [] };
  const colorsMap = new Map<string, { name: string; hex: string }>();
  const sizesSet = new Set<string>();
  
  variants.forEach((v: any) => {
    if (v.color) {
      colorsMap.set(v.color.id, { name: v.color.name, hex: v.color.hexCode });
    }
    if (v.size) {
      sizesSet.add(v.size.abbreviation || v.size.value);
    }
  });
  
  return {
    colors: Array.from(colorsMap.values()),
    sizes: Array.from(sizesSet),
  };
};

export default function ActualizarCotizacion() {
  const router = useRouter();
  const pathParams = useParams();
  const id = pathParams?.id as string;

  const [step, setStep] = useState(1);

  const [garmentType, setGarmentType] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [price, setPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [message, setMessage] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [designs, setDesigns] = useState<any[]>([]);

  // Nuevos estados para el buscador inteligente y la prenda seleccionada
  const [selectedProductId, setSelectedProductId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch initial quote detail
  const { data: quote, isLoading } = useQuery<any>({
    queryKey: ["quote-detail-edit", id],
    queryFn: async () => {
      if (!id) return null;
      return apiGet(`/api/merchant/quotes/${id}`);
    },
    enabled: !!id 
  });

  // Carga de catálogo detallado (con todas sus variantes) para el buscador cliente
  const { data: detailedProducts, isLoading: isLoadingCatalog } = useQuery<any[]>({
    queryKey: ["detailed-catalog-products"],
    queryFn: async () => {
      const res: any = await apiGet("/api/products?limit=100");
      const list = res.data || [];
      const detailed = await Promise.all(
        list.map(async (p: any) => {
          try {
            return (await apiGet(`/api/products/${p.id}`)) as any;
          } catch {
            return p;
          }
        })
      );
      return detailed;
    }
  });

  // Cargar atributos globales de admin para mapear las técnicas en el Paso 3
  const { data: adminAttributes } = useQuery<any>({
    queryKey: ["admin-attributes"],
    queryFn: async () => {
      return apiGet("/api/admin/attributes");
    }
  });

  const techniquesList = useMemo(() => adminAttributes?.techniques || [], [adminAttributes]);

  // Prenda seleccionada actualmente
  const selectedProduct = useMemo(() => {
    return detailedProducts?.find((p: any) => p.id === selectedProductId) || null;
  }, [detailedProducts, selectedProductId]);

  // Obtener las imágenes de la prenda seleccionada
  const productImages = useMemo(() => {
    if (!selectedProduct?.images || selectedProduct.images.length === 0) {
      return [{ url: "https://placehold.co/800x800/FFFFFF/000000.png?text=Sin+Imagen" }];
    }
    return selectedProduct.images;
  }, [selectedProduct]);

  // Filtro del buscador inteligente
  const filteredCatalog = useMemo(() => {
    if (!detailedProducts) return [];
    if (!searchQuery.trim()) return detailedProducts;

    const query = searchQuery.toLowerCase().trim();
    return detailedProducts.filter((p: any) => {
      const nameMatch = p.name?.toLowerCase().includes(query);
      const categoryMatch = p.category?.name?.toLowerCase().includes(query);
      const fabricMatch = p.fabric?.value?.toLowerCase().includes(query);
      const descriptionMatch = p.description?.toLowerCase().includes(query);

      const colorMatch = p.variants?.some((v: any) =>
        v.color?.name?.toLowerCase().includes(query)
      );
      const sizeMatch = p.variants?.some((v: any) =>
        v.size?.abbreviation?.toLowerCase().includes(query) ||
        v.size?.value?.toLowerCase().includes(query)
      );

      return nameMatch || categoryMatch || fabricMatch || descriptionMatch || colorMatch || sizeMatch;
    });
  }, [detailedProducts, searchQuery]);

  // Manejar selección de producto base
  const handleSelectProduct = (product: any) => {
    setSelectedProductId(product.id);
    setGarmentType(product.name);
    setFabricType(product.fabric?.value || "");
    setActiveImageIndex(0);
  };

  // Load initial states when quote loads
  useEffect(() => {
    if (quote) {
      setGarmentType(quote.items?.[0]?.productVariant?.product?.name || quote.garmentType || "Polo Básico");
      setFabricType(quote.items?.[0]?.productVariant?.product?.fabric?.value || quote.fabricType || "Algodón");
      setPrice(quote.estimatedPrice || quote.quotedPrice ? String(quote.estimatedPrice || quote.quotedPrice) : "");
      setMessage(quote.merchantMessage || "");
      setEstimatedDays("");
      
      const firstProdId = quote.items?.[0]?.productVariant?.product?.id || quote.items?.[0]?.productVariant?.productId;
      if (firstProdId && !selectedProductId) {
        setSelectedProductId(firstProdId);
        setActiveImageIndex(0);
      }

      const qMap: Record<string, number> = {};
      quote.items?.forEach((item: any) => {
        const colId = item.productVariant?.colorId;
        const szId = item.productVariant?.sizeId;
        if (colId && szId) {
          qMap[`${colId}_${szId}`] = item.quantity;
        }
      });
      setQuantities(qMap);

      if (quote.designs) {
        setDesigns(quote.designs.map((d: any) => ({
          id: d.id,
          placement: d.placement,
          techniqueName: d.technique?.name || "",
          width: d.width || 0,
          height: d.height || 0,
          rotation: d.rotation || 0,
          baseGarmentUrl: d.baseGarmentUrl || "",
          logoUrl: d.logoUrl || "",
          positionX: d.positionX || 0,
          positionY: d.positionY || 0,
          canvasWidth: d.canvasWidth || 500,
          canvasHeight: d.canvasHeight || 500,
        })));
      }
    }
  }, [quote]);

  // Respond / Update quote mutation
  const respondMutation = useMutation({
    mutationFn: (data: { quotedPrice: number; merchantMessage?: string; items?: any[]; designs?: any[] }) => 
      apiPatch(`/api/merchant/quotes/${id}/respond`, data),
    onSuccess: () => {
      toast.success("Propuesta de cotización actualizada con éxito");
      router.push(`/gestion-cotizaciones/${id}`);
    },
    onError: (err: any) => {
      toast.error("Error al actualizar la cotización", { description: err.message });
    }
  });

  // Extract unique sizes and colors from the selected product variants (or original quote items as fallback)
  const uniqueSizes = useMemo(() => {
    const sizesMap = new Map<string, { id: string; name: string; abbreviation: string }>();

    if (selectedProduct?.variants) {
      selectedProduct.variants.forEach((v: any) => {
        const sz = v.size;
        if (sz && !sizesMap.has(sz.id)) {
          sizesMap.set(sz.id, {
            id: sz.id,
            name: sz.value,
            abbreviation: sz.abbreviation,
          });
        }
      });
    } else if (quote?.items) {
      quote.items.forEach((item: any) => {
        const sz = item.productVariant?.size;
        if (sz && !sizesMap.has(sz.id)) {
          sizesMap.set(sz.id, sz);
        }
      });
    }

    const standardOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    return Array.from(sizesMap.values()).sort((a, b) => {
      const idxA = standardOrder.indexOf(a.abbreviation);
      const idxB = standardOrder.indexOf(b.abbreviation);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [selectedProduct, quote?.items]);

  const uniqueColors = useMemo(() => {
    const colorsMap = new Map<string, { id: string; name: string; hex: string }>();

    if (selectedProduct?.variants) {
      selectedProduct.variants.forEach((v: any) => {
        const col = v.color;
        if (col && !colorsMap.has(col.id)) {
          colorsMap.set(col.id, {
            id: col.id,
            name: col.name,
            hex: col.hexCode,
          });
        }
      });
    } else if (quote?.items) {
      quote.items.forEach((item: any) => {
        const col = item.productVariant?.color;
        if (col && !colorsMap.has(col.id)) {
          colorsMap.set(col.id, {
            id: col.id,
            name: col.name,
            hex: col.hexCode,
          });
        }
      });
    }

    return Array.from(colorsMap.values());
  }, [selectedProduct, quote?.items]);

  const getQuantity = (colorId: string, sizeId: string) => {
    return quantities[`${colorId}_${sizeId}`] || 0;
  };

  const handleQuantityChange = (colorId: string, sizeId: string, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setQuantities(prev => ({
      ...prev,
      [`${colorId}_${sizeId}`]: num
    }));
  };

  const getColorTotal = (colorId: string) => {
    return uniqueSizes.reduce((acc: number, size: any) => acc + getQuantity(colorId, size.id), 0);
  };

  const getSizeTotal = (sizeId: string) => {
    return uniqueColors.reduce((acc: number, color: any) => acc + getQuantity(color.id, sizeId), 0);
  };

  const totalQuantity = useMemo(() => {
    return Object.values(quantities).reduce((acc: number, q: number) => acc + q, 0);
  }, [quantities]);

  const handleDesignChange = (idx: number, field: string, val: any) => {
    setDesigns(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSave = () => {
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Por favor ingresa un precio propuesto válido");
      return;
    }
    if (!estimatedDays.trim()) {
      toast.error("Por favor ingresa el tiempo estimado de producción");
      return;
    }
    if (!message.trim()) {
      toast.error("Por favor ingresa un mensaje comercial");
      return;
    }

    const fullMessage = `${message.trim()} (Plazo de producción: ${estimatedDays.trim()})`;

    // Construir la lista de items actualizados mapeando a variante de producto
    const itemsPayload = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [colorId, sizeId] = key.split('_');
        
        // Buscar variante en la prenda base seleccionada actualmente
        const variant = selectedProduct?.variants?.find(
          (v: any) => v.colorId === colorId && v.sizeId === sizeId
        );
        
        // Fallback a la variante original si no se encuentra y sigue siendo el mismo producto
        const isSameProduct = selectedProduct?.id === (quote.items?.[0]?.productVariant?.product?.id || quote.items?.[0]?.productVariant?.productId);
        const originalItem = isSameProduct 
          ? quote.items?.find((item: any) => item.productVariant?.colorId === colorId && item.productVariant?.sizeId === sizeId)
          : null;

        return {
          productVariantId: variant?.id || originalItem?.productVariantId,
          quantity: qty,
        };
      })
      .filter((item) => !!item.productVariantId);

    // Mapear los diseños con su técnica correspondiente
    const designsPayload = designs.map((d) => {
      const tech = techniquesList.find((t: any) => t.name === d.techniqueName);
      const originalDesign = quote.designs?.find((orig: any) => orig.id === d.id);
      
      return {
        placement: d.placement,
        techniqueId: tech?.id || originalDesign?.techniqueId || "",
        baseGarmentUrl: d.baseGarmentUrl || originalDesign?.baseGarmentUrl || "/prenda-base.png",
        logoUrl: d.logoUrl || originalDesign?.logoUrl || "",
        positionX: d.positionX || originalDesign?.positionX || 0,
        positionY: d.positionY || originalDesign?.positionY || 0,
        width: Number(d.width) || originalDesign?.width || 100,
        height: Number(d.height) || originalDesign?.height || 100,
        rotation: Number(d.rotation) || originalDesign?.rotation || 0,
        canvasWidth: d.canvasWidth || originalDesign?.canvasWidth || 500,
        canvasHeight: d.canvasHeight || originalDesign?.canvasHeight || 500,
      };
    });

    respondMutation.mutate({
      quotedPrice: Number(price),
      merchantMessage: fullMessage,
      items: itemsPayload,
      designs: designsPayload,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 flex h-64 items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <span>Cargando cotización para edición...</span>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col h-64 items-center justify-center gap-2">
        <p className="font-bold text-lg">Cotización no encontrada.</p>
        <Link href="/gestion-cotizaciones" className="mt-4 text-blue-500 underline">Volver a la bandeja</Link>
      </div>
    );
  }

  const isStepValid = () => {
    if (step === 1) {
      return garmentType.trim() !== "" && fabricType.trim() !== "";
    }
    if (step === 2) {
      return totalQuantity > 0;
    }
    if (step === 4) {
      return price !== "" && !isNaN(Number(price)) && estimatedDays.trim() !== "" && message.trim() !== "";
    }
    return true; // Step 3 designs is always valid since it has default selects/values
  };

  return (
    <div className="font-sans w-full min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-20">
      {/* Cabecera */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/gestion-cotizaciones/${id}`} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Cotización #{(id || "").slice(0, 6).toUpperCase()} {">"} <span className="font-semibold text-slate-900">Actualizar Asistente</span></p>
            <h1 className="text-xl font-bold text-slate-900">Actualizar Información</h1>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm mb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-400 mb-2.5">
            <span className={step >= 1 ? "text-blue-600" : ""}>1. Prenda y Tela</span>
            <span className={step >= 2 ? "text-blue-600" : ""}>2. Matriz de Cantidades</span>
            <span className={step >= 3 ? "text-blue-600" : ""}>3. Especificaciones de Diseño</span>
            <span className={step >= 4 ? "text-blue-600" : ""}>4. Propuesta Comercial</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${step * 25}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Contenido del paso actual */}
      <div className="max-w-4xl mx-auto px-6">
        
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Paso 1: Detalles del Producto Solicitado</h3>
                <p className="text-xs text-slate-500">Busca y selecciona una prenda base del catálogo para actualizar los materiales y especificaciones.</p>
              </div>
            </div>
            
            {/* Buscador inteligente */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">Buscador Inteligente</label>
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca por nombre, tela (ej. Piqué, Jersey), categoría, color o talla..."
                  className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-lg bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Resultados de Búsqueda Horizontales */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isLoadingCatalog ? "Cargando catálogo..." : `Resultados Disponibles (${filteredCatalog.length})`}
              </label>
              
              {isLoadingCatalog ? (
                <div className="flex gap-4 overflow-x-auto py-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="w-72 h-36 bg-slate-50 animate-pulse border border-slate-100 rounded-xl shrink-0"></div>
                  ))}
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400">No se encontraron prendas con ese filtro.</p>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {filteredCatalog.map((prod: any) => {
                    const isSelected = prod.id === selectedProductId;
                    const { colors: prodColors, sizes: prodSizes } = getProductColorsAndSizes(prod.variants);
                    
                    return (
                      <div 
                        key={prod.id}
                        className={`w-72 p-4 border rounded-xl shrink-0 transition-all duration-200 flex flex-col justify-between ${
                          isSelected 
                            ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/30 shadow-sm" 
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <div>
                          <div className="flex gap-3">
                            <div className="w-14 h-14 bg-slate-100 rounded-lg relative overflow-hidden shrink-0 border border-slate-200/50 flex items-center justify-center text-2xl">
                              {prod.images?.[0]?.url ? (
                                <img src={prod.images[0].url} alt={prod.name} className="object-cover w-full h-full" />
                              ) : (
                                "👕"
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                ID: {prod.id.slice(0, 8).toUpperCase()}
                              </span>
                              <h4 className="font-bold text-slate-800 text-xs leading-tight truncate mt-0.5" title={prod.name}>
                                {prod.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-1 truncate">
                                Tela: <span className="font-semibold text-slate-700">{prod.fabric?.value || "Estándar"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                            <div className="flex -space-x-1 overflow-hidden">
                              {prodColors.slice(0, 4).map((c: any, index: number) => (
                                <div 
                                  key={index} 
                                  className="w-3.5 h-3.5 rounded-full border border-white shadow-sm shrink-0" 
                                  style={{ backgroundColor: c.hex }}
                                  title={c.name}
                                ></div>
                              ))}
                              {prodColors.length > 4 && (
                                <span className="text-[9px] font-bold text-slate-400 pl-1.5 self-center">
                                  +{prodColors.length - 4}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-0.5">
                              {prodSizes.slice(0, 3).map((sz: string, index: number) => (
                                <span key={index} className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200/55">
                                  {sz}
                                </span>
                              ))}
                              {prodSizes.length > 3 && (
                                <span className="text-[8px] font-bold text-slate-400 self-center pl-0.5">
                                  ...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectProduct(prod)}
                          className={`w-full mt-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isSelected 
                              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Seleccionado
                            </>
                          ) : (
                            "Seleccionar"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vista de Detalles de Prenda Seleccionada */}
            {selectedProduct && (
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 mt-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-4 pl-2">
                  <Check className="h-4 w-4 text-blue-600" />
                  Prenda Base Seleccionada
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-2">
                  {/* Imagen principal y Galería */}
                  <div className="md:col-span-1 flex flex-col gap-3">
                    <div className="w-full aspect-square bg-white border border-slate-200/70 rounded-xl overflow-hidden shadow-sm relative flex items-center justify-center text-7xl">
                      {productImages?.[activeImageIndex]?.url ? (
                        <img 
                          src={productImages[activeImageIndex].url} 
                          alt={`${selectedProduct.name} - Imagen ${activeImageIndex + 1}`} 
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        "👕"
                      )}
                    </div>
                    
                    {/* Miniaturas de imágenes */}
                    {productImages && productImages.length > 1 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {productImages.map((img: any, idx: number) => {
                          const isImgActive = idx === activeImageIndex;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImageIndex(idx)}
                              className={`w-12 h-12 rounded-lg border-2 overflow-hidden bg-white transition-all shadow-sm shrink-0 ${
                                isImgActive 
                                  ? "border-blue-500 ring-2 ring-blue-500/10 scale-105" 
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <img src={img.url} alt={`Miniatura ${idx + 1}`} className="object-cover w-full h-full" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                  </div>

                  {/* Especificaciones */}
                  <div className="md:col-span-1 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                          {selectedProduct.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">ID: {selectedProduct.id}</p>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                            Categoría: {selectedProduct.category?.name || "Sin categoría"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-100">
                            Tela: {selectedProduct.fabric?.value || "Sin especificar"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 bg-green-50 border border-green-200/60 rounded-xl px-3 py-1.5 shadow-sm">
                        <span className="text-[9px] font-bold text-green-600 block uppercase tracking-wider">Precio Base</span>
                        <span className="text-sm font-black text-green-700">
                          {formatPrice(selectedProduct.basePrice)}
                        </span>
                      </div>
                    </div>

                    {selectedProduct.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                        {selectedProduct.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px] block mb-1">Composición de Fibra</span>
                        <p className="font-semibold text-slate-700">{selectedProduct.fiberComposition || "N/A"}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px] block mb-1">Instrucciones de Cuidado</span>
                        <p className="font-semibold text-slate-700">{selectedProduct.careInstructions || "N/A"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <span className="font-bold text-slate-500 text-[10px] block mb-2 uppercase tracking-wider">Colores en Catálogo</span>
                        <div className="flex flex-wrap gap-2">
                          {getProductColorsAndSizes(selectedProduct.variants).colors.map((c: any, idx: number) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-sm"
                            >
                              <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: c.hex }} />
                              {c.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-slate-500 text-[10px] block mb-2 uppercase tracking-wider">Tallas en Catálogo</span>
                        <div className="flex flex-wrap gap-1.5">
                          {getProductColorsAndSizes(selectedProduct.variants).sizes.map((sz: string, idx: number) => (
                            <span 
                              key={idx}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-extrabold text-slate-700 shadow-sm"
                            >
                              {sz}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Paso 2: Ajuste de Matriz de Cantidades</h3>
                <p className="text-xs text-slate-500">Modifica las cantidades requeridas por combinación de color y talla.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 font-semibold bg-slate-50 border-b border-slate-100 uppercase">
                  <tr>
                    <th className="py-3 px-2 whitespace-nowrap">Color / Talla</th>
                    {uniqueSizes.map((size: any) => (
                      <th key={size.id} className="py-3 px-2 text-center w-18">{size.abbreviation || size.name}</th>
                    ))}
                    <th className="py-3 px-2 text-center font-bold text-slate-700 w-24 bg-slate-50">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uniqueColors.map((color: any) => (
                    <tr key={color.id}>
                      <td className="py-3 px-2 flex items-center gap-2 whitespace-nowrap">
                        <div 
                          className="w-4 h-4 rounded-full border border-slate-200 shadow-sm shrink-0" 
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <span className="font-medium text-slate-700 text-xs">{color.name}</span>
                      </td>
                      {uniqueSizes.map((size: any) => (
                        <td key={size.id} className="py-2 px-1 text-center">
                          <Input 
                            type="number"
                            min="0"
                            value={getQuantity(color.id, size.id)}
                            onChange={(e) => handleQuantityChange(color.id, size.id, e.target.value)}
                            className="h-9 w-16 text-center"
                          />
                        </td>
                      ))}
                      <td className="py-3 px-2 text-center font-bold text-slate-900 bg-slate-50">
                        {getColorTotal(color.id)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Fila de Totales */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <td className="py-3 px-2 text-slate-700 text-xs uppercase whitespace-nowrap">Totales por Talla</td>
                    {uniqueSizes.map((size: any) => (
                      <td key={size.id} className="py-3 px-2 text-center text-blue-700">
                        {getSizeTotal(size.id)}
                      </td>
                    ))}
                    <td className="py-3 px-2 text-center text-orange-600 text-base bg-orange-50/50">
                      {totalQuantity}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Paso 3: Especificaciones Técnicas del Diseño</h3>
                <p className="text-xs text-slate-500">Indica el método de producción y dimensiones para cada colocación de logo.</p>
              </div>
            </div>

            {designs.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">No hay personalizaciones registradas en esta cotización.</p>
            ) : (
              <div className="space-y-6 pt-2 divide-y divide-slate-100">
                {designs.map((design, idx) => (
                  <div key={design.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">
                        Posición: {design.placement === "FRONT" ? "Frontal" : design.placement === "BACK" ? "Espalda" : design.placement === "LEFTSLEEVE" ? "Manga Izq." : "Manga Der."}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Método / Técnica</label>
                        <select 
                          value={design.techniqueName} 
                          onChange={(e) => handleDesignChange(idx, "techniqueName", e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="DTF">DTF</option>
                          <option value="Bordado">Bordado</option>
                          <option value="Serigrafía">Serigrafía</option>
                          <option value="Sublimado">Sublimado</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Ancho (px)</label>
                        <Input 
                          type="number"
                          value={Math.round(design.width)}
                          onChange={(e) => handleDesignChange(idx, "width", parseInt(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Alto (px)</label>
                        <Input 
                          type="number"
                          value={Math.round(design.height)}
                          onChange={(e) => handleDesignChange(idx, "height", parseInt(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Rotación (°)</label>
                        <Input 
                          type="number"
                          value={Math.round(design.rotation)}
                          onChange={(e) => handleDesignChange(idx, "rotation", parseInt(e.target.value) || 0)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Formulario */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Banknote className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Paso 4: Propuesta Comercial</h3>
                  <p className="text-xs text-slate-500">Define los valores financieros y el mensaje final para el cliente.</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Precio Final (S/) *</label>
                    <Input 
                      type="number" 
                      placeholder="Ej. 1250" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-11 font-bold text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Tiempo de Producción *</label>
                    <Input 
                      placeholder="Ej. 5 días hábiles" 
                      value={estimatedDays}
                      onChange={(e) => setEstimatedDays(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Mensaje Comercial *</label>
                  <Textarea 
                    placeholder="Ej. Propuesta actualizada considerando las cantidades finales..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
              <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Resumen de Cambios</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Prenda:</span>
                  <span className="font-semibold text-slate-800">{garmentType}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Tela:</span>
                  <span className="font-semibold text-slate-800">{fabricType}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Total de prendas:</span>
                  <span className="font-semibold text-slate-800">{totalQuantity} unidades</span>
                </div>
                <div className="flex justify-between items-start text-slate-500">
                  <span>Personalizaciones:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {designs.map(d => `${d.placement === 'FRONT' ? 'Frontal' : d.placement === 'BACK' ? 'Espalda' : d.placement === 'RIGHTSLEEVE' ? 'Manga Der.' : 'Manga Izq.'} (${d.techniqueName})`).join(', ')}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-3 rounded-lg flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Al guardar, se enviará la cotización con las nuevas especificaciones directamente al buzón del cliente.</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Botonera de Asistente Sticky */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-6 z-20 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          <Button
            variant="outline"
            disabled={step === 1 || respondMutation.isPending}
            onClick={() => setStep(prev => prev - 1)}
            className="font-bold flex items-center gap-2 border-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </Button>

          {step < 4 ? (
            <Button
              disabled={!isStepValid()}
              onClick={() => setStep(prev => prev + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!isStepValid() || respondMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
            >
              {respondMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar y Enviar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
