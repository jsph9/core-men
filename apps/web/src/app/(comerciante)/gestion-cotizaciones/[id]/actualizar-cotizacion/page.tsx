"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import dynamic from "next/dynamic";
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
  Shirt,
  Upload,
  X,
  ChevronRight,
  ChevronDown,
  Download,
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer2
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

const getGarmentImageForPlacement = (placement: string, product: any, defaultUrl: string) => {
  if (!product || !product.images || product.images.length === 0) {
    return defaultUrl || "/prenda-base.png";
  }
  
  const images = product.images;
  
  if (placement === "FRONT") {
    const primary = images.find((img: any) => img.isPrimary);
    return primary?.url || images[0]?.url || defaultUrl;
  }
  
  if (placement === "BACK") {
    const backImg = images.find((img: any) => {
      const urlLower = (img.url || "").toLowerCase();
      return urlLower.includes("back") || urlLower.includes("espalda") || urlLower.includes("posterior");
    });
    return backImg?.url || images[1]?.url || images[0]?.url || defaultUrl;
  }
  
  if (placement === "LEFTSLEEVE") {
    const leftImg = images.find((img: any) => {
      const urlLower = (img.url || "").toLowerCase();
      return urlLower.includes("left") || urlLower.includes("izq") || urlLower.includes("manga-izq");
    });
    if (leftImg) return leftImg.url;
    
    const rightImg = images.find((img: any) => {
      const urlLower = (img.url || "").toLowerCase();
      return urlLower.includes("right") || urlLower.includes("der") || urlLower.includes("manga-der");
    });
    return rightImg?.url || images[3]?.url || images[0]?.url || defaultUrl;
  }
  
  if (placement === "RIGHTSLEEVE") {
    const rightImg = images.find((img: any) => {
      const urlLower = (img.url || "").toLowerCase();
      return urlLower.includes("right") || urlLower.includes("der") || urlLower.includes("manga-der");
    });
    if (rightImg) return rightImg.url;
    
    const leftImg = images.find((img: any) => {
      const urlLower = (img.url || "").toLowerCase();
      return urlLower.includes("left") || urlLower.includes("izq") || urlLower.includes("manga-izq");
    });
    return leftImg?.url || images[2]?.url || images[0]?.url || defaultUrl;
  }
  
  return defaultUrl;
};

const CustomizerDinamico = dynamic(
  () => import("@/components/Customizer/Customizer"),
  { ssr: false, loading: () => <p className="text-center p-4 text-xs text-slate-400">Cargando visualizador 2D...</p> }
);

export default function ActualizarCotizacion() {
  const router = useRouter();
  const pathParams = useParams();
  const id = pathParams?.id as string;

  const [step, setStep] = useState(1);

  const [garmentType, setGarmentType] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [price, setPrice] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [message, setMessage] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [designs, setDesigns] = useState<any[]>([]);

  // Nuevos estados para el buscador inteligente y la prenda seleccionada
  const [selectedProductId, setSelectedProductId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeDesignIdx, setActiveDesignIdx] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>("Upload Design");
  const [activeBgUrl, setActiveBgUrl] = useState<string>("https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/imagenes-coremen/whitewall.jpg");
  const [zoom, setZoom] = useState<number>(1.0);
  const [mode, setMode] = useState<"select" | "pan">("select");
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(true);

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

  // Cargar detalles completos del producto seleccionado (por ID) para asegurar sus imágenes/variantes
  const { data: selectedProductDetail } = useQuery<any>({
    queryKey: ["product-detail", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      return apiGet(`/api/products/${selectedProductId}`);
    },
    enabled: !!selectedProductId
  });

  // Prenda seleccionada actualmente
  const selectedProduct = useMemo(() => {
    return selectedProductDetail || detailedProducts?.find((p: any) => p.id === selectedProductId) || null;
  }, [detailedProducts, selectedProductId, selectedProductDetail]);

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
      setPrice(quote.customerPrice || quote.estimatedPrice || quote.quotedPrice ? String(quote.customerPrice || quote.estimatedPrice || quote.quotedPrice) : "");
      setFinalPrice(quote.finalPrice ? String(quote.finalPrice) : "");
      setMessage(quote.merchantMessage || "");
      setEstimatedDays(quote.estimatedProductionTime ? String(quote.estimatedProductionTime) : "");
      
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

  // Sincronizar las URLs de la prenda base cuando cambie la prenda seleccionada
  useEffect(() => {
    if (selectedProduct && selectedProduct.images && selectedProduct.images.length > 0) {
      setDesigns(prev => 
        prev.map(d => ({
          ...d,
          baseGarmentUrl: getGarmentImageForPlacement(d.placement, selectedProduct, d.baseGarmentUrl)
        }))
      );
    }
  }, [selectedProduct]);

  // Respond / Update quote mutation
  const respondMutation = useMutation({
    mutationFn: (data: { quotedPrice: number; finalPrice?: number; estimatedProductionTime?: number; merchantMessage?: string; items?: any[]; designs?: any[] }) => 
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
    let sum = 0;
    uniqueColors.forEach((color: any) => {
      uniqueSizes.forEach((size: any) => {
        sum += getQuantity(color.id, size.id);
      });
    });
    return sum;
  }, [uniqueColors, uniqueSizes, quantities]);

  // Lógica de cálculo de descuentos en tiempo real
  const discountDetails = useMemo(() => {
    if (!quote || !quote.availableDiscounts) {
      return { volumeDiscount: null, volumePct: 0, seasonDiscount: null, seasonPct: 0, totalDiscountPct: 0, combinedType: 'none', showVolume: false, showSeason: false };
    }

    const { discountRules = [], seasonDiscounts = [] } = quote.availableDiscounts;
    const qty = totalQuantity || 0;

    // 1. Descuento por cantidad (Volume)
    const volumeDiscount = discountRules.find((rule: any) => {
      const minQty = Number(rule.minQuantity);
      const maxQty = rule.maxQuantity !== null ? Number(rule.maxQuantity) : null;
      return qty >= minQty && (maxQty === null || qty <= maxQty);
    });
    const volumePct = volumeDiscount ? Number(volumeDiscount.percentage) : 0;

    // 2. Descuento por temporada (Season)
    const applicableSeasonDiscounts = seasonDiscounts.filter((sd: any) => {
      if (!sd.appliesTo || sd.appliesTo.length === 0) return true;
      const currentCatName = selectedProduct?.category?.name || quote.items?.[0]?.productVariant?.product?.category?.name;
      const currentCatId = selectedProduct?.categoryId || quote.items?.[0]?.productVariant?.product?.categoryId;
      return sd.appliesTo.includes(currentCatName) || sd.appliesTo.includes(currentCatId);
    });

    let seasonDiscount = null;
    let seasonPct = 0;
    if (applicableSeasonDiscounts.length > 0) {
      seasonDiscount = applicableSeasonDiscounts.reduce((max: any, current: any) => {
        return Number(current.percentage) > Number(max.percentage) ? current : max;
      }, applicableSeasonDiscounts[0]);
      seasonPct = Number(seasonDiscount.percentage);
    }

    // 3. Combinación de descuentos
    let totalDiscountPct = 0;
    let combinedType = 'none';

    if (volumePct > 0 && seasonPct > 0) {
      if (seasonDiscount.isAccumulative) {
        totalDiscountPct = Math.min(volumePct + seasonPct, 100);
        combinedType = 'accumulative';
      } else {
        totalDiscountPct = Math.max(volumePct, seasonPct);
        combinedType = 'max';
      }
    } else if (volumePct > 0) {
      totalDiscountPct = volumePct;
    } else if (seasonPct > 0) {
      totalDiscountPct = seasonPct;
    }

    return {
      volumeDiscount,
      volumePct,
      seasonDiscount,
      seasonPct,
      totalDiscountPct,
      combinedType,
      showVolume: volumePct > 0,
      showSeason: seasonPct > 0
    };
  }, [quote, totalQuantity, selectedProduct]);

  const handleBasePriceChange = (val: string) => {
    setPrice(val);
    if (!val || isNaN(Number(val))) {
      setFinalPrice("");
      return;
    }
    const base = Number(val);
    const pct = discountDetails.totalDiscountPct;
    const final = base * (1 - pct / 100);
    setFinalPrice(final.toFixed(2));
  };

  const handleFinalPriceChange = (val: string) => {
    setFinalPrice(val);
    if (!val || isNaN(Number(val))) {
      setPrice("");
      return;
    }
    const final = Number(val);
    const pct = discountDetails.totalDiscountPct;
    if (pct >= 100) {
      setPrice("0.00");
    } else {
      const base = final / (1 - pct / 100);
      setPrice(base.toFixed(2));
    }
  };

  // Recalcular el precio final si cambia el descuento (p.ej. por cambio de cantidades)
  useEffect(() => {
    if (price && !isNaN(Number(price))) {
      const base = Number(price);
      const pct = discountDetails.totalDiscountPct;
      const final = base * (1 - pct / 100);
      setFinalPrice(final.toFixed(2));
    }
  }, [discountDetails.totalDiscountPct]);

  const handleDesignChange = (idx: number, field: string, val: any) => {
    setDesigns(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      handleDesignChange(activeDesignIdx, "logoUrl", localUrl);
      toast.success("Logo cargado temporalmente para visualización.");
    }
  };

  const selectOrCreatePlacement = (placement: "FRONT" | "BACK" | "LEFTSLEEVE" | "RIGHTSLEEVE") => {
    const idx = designs.findIndex(d => d.placement === placement);
    if (idx !== -1) {
      setActiveDesignIdx(idx);
    } else {
      const newDesign = {
        id: `new-${placement.toLowerCase()}-${Date.now()}`,
        placement: placement,
        techniqueName: "DTF",
        width: 100,
        height: 100,
        rotation: 0,
        baseGarmentUrl: "",
        logoUrl: "",
        positionX: 150,
        positionY: 150,
        canvasWidth: 500,
        canvasHeight: 500,
      };
      setDesigns(prev => [...prev, newDesign]);
      setActiveDesignIdx(designs.length);
    }
  };

  const handleSave = () => {
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Por favor ingresa un precio propuesto válido");
      return;
    }
    const days = parseInt(estimatedDays, 10);
    if (isNaN(days) || days <= 0) {
      toast.error("Por favor ingresa una cantidad de días de producción válida (número entero positivo)");
      return;
    }
    // Concatenate discounts into the message
    let discountText = "";
    if (discountDetails.volumePct > 0) {
      discountText += `\n- Descuento por cantidad (${totalQuantity} unidades): ${discountDetails.volumePct}%`;
    }
    if (discountDetails.seasonPct > 0) {
      discountText += `\n- Descuento por temporada: ${discountDetails.seasonPct}%`;
    }
    if (discountText) {
      const typeText = discountDetails.combinedType === 'accumulative' 
        ? " (Acumulativo)" 
        : discountDetails.combinedType === 'max' 
          ? " (Se aplicó el mayor)" 
          : "";
      discountText = `\n\n[Descuentos Aplicados${typeText}]:${discountText}\nDescuento Total: -${discountDetails.totalDiscountPct}%`;
    }

    const fullMessage = message.trim() + discountText;

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
      const resolvedGarmentUrl = getGarmentImageForPlacement(d.placement, selectedProduct, d.baseGarmentUrl);
      
      return {
        placement: d.placement,
        techniqueId: tech?.id || "",
        baseGarmentUrl: resolvedGarmentUrl || "/prenda-base.png",
        logoUrl: d.logoUrl || "",
        positionX: d.positionX !== undefined ? Number(d.positionX) : 0,
        positionY: d.positionY !== undefined ? Number(d.positionY) : 0,
        width: d.width !== undefined ? Number(d.width) : 100,
        height: d.height !== undefined ? Number(d.height) : 100,
        rotation: d.rotation !== undefined ? Number(d.rotation) : 0,
        canvasWidth: d.canvasWidth !== undefined ? Number(d.canvasWidth) : 500,
        canvasHeight: d.canvasHeight !== undefined ? Number(d.canvasHeight) : 500,
      };
    });

    respondMutation.mutate({
      quotedPrice: Number(price),
      finalPrice: Number(finalPrice) || undefined,
      estimatedProductionTime: days,
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
      <div className="max-w-7xl mx-auto px-6">
        
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
                            <div className="w-14 h-14 bg-slate-100 rounded-lg relative overflow-hidden shrink-0 border border-slate-200/50 flex items-center justify-center text-2xl p-1 bg-white">
                              {prod.images?.[0]?.url ? (
                                <img src={prod.images[0].url} alt={prod.name} className="object-contain w-full h-full" />
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
                    <div className="w-full aspect-square bg-white border border-slate-200/70 rounded-xl overflow-hidden shadow-sm relative flex items-center justify-center text-7xl p-3">
                      {productImages?.[activeImageIndex]?.url ? (
                        <img 
                          src={productImages[activeImageIndex].url} 
                          alt={`${selectedProduct.name} - Imagen ${activeImageIndex + 1}`} 
                          className="object-contain w-full h-full hover:scale-105 transition-transform duration-300"
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
                              className={`w-12 h-12 rounded-lg border-2 overflow-hidden bg-white transition-all shadow-sm shrink-0 p-1 flex items-center justify-center ${
                                isImgActive 
                                  ? "border-blue-500 ring-2 ring-blue-500/10 scale-105" 
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <img src={img.url} alt={`Miniatura ${idx + 1}`} className="object-contain max-w-full max-h-full" />
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
          <div className="space-y-6">
            {/* Cabecera del Paso 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Paso 3: Especificaciones Técnicas del Diseño</h3>
                  <p className="text-xs text-slate-500">Ajusta la posición del logo sobre la prenda y define las especificaciones técnicas de forma visual e interactiva.</p>
                </div>
              </div>
            </div>

            {designs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                No hay personalizaciones registradas en esta cotización.
              </div>
            ) : (
              /* Unified Workspace Container with absolute/floating layouts */
              <div 
                className="relative w-full h-[700px] rounded-3xl overflow-hidden border border-slate-200 shadow-lg flex items-center justify-center transition-all duration-300 select-none bg-cover bg-center"
                style={{
                  backgroundImage: `url(${activeBgUrl})`,
                }}
              >
                {/* Visibility Area Wrapper (centers canvas, zoom, and coordinate panels in the visible space to the left of the sidebar) */}
                <div className="absolute left-0 right-[344px] top-0 bottom-0 pointer-events-none z-0">
                  {/* 1. Canvas Konva (Centered Transparent Canvas) */}
                  <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                    {designs[activeDesignIdx] && (
                      <CustomizerDinamico
                        baseGarmentUrl={getGarmentImageForPlacement(
                          designs[activeDesignIdx].placement,
                          selectedProduct,
                          designs[activeDesignIdx].baseGarmentUrl
                        )}
                        logoUrl={designs[activeDesignIdx].logoUrl}
                        positionX={designs[activeDesignIdx].positionX}
                        positionY={designs[activeDesignIdx].positionY}
                        width={designs[activeDesignIdx].width}
                        height={designs[activeDesignIdx].height}
                        rotation={designs[activeDesignIdx].rotation}
                        canvasWidth={designs[activeDesignIdx].canvasWidth}
                        canvasHeight={designs[activeDesignIdx].canvasHeight}
                        zoom={zoom}
                        mode={mode}
                        isSimulationActive={isSimulationActive}
                        onChange={(updates) => {
                          setDesigns(prev => {
                            const copy = [...prev];
                            copy[activeDesignIdx] = {
                              ...copy[activeDesignIdx],
                              ...updates
                            };
                            return copy;
                          });
                        }}
                      />
                    )}
                  </div>

                  {/* 2. Floating Tools & Zoom Control (Top Left) */}
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-4.5 z-10 transition-all hover:bg-white pointer-events-auto">
                    {/* Selector de Modo: Puntero vs Mano */}
                    <div className="flex items-center gap-1 border-r border-slate-200 pr-3.5">
                      <button
                        type="button"
                        onClick={() => setMode("select")}
                        className={`p-1.5 rounded-lg active:scale-95 transition-all ${
                          mode === "select"
                            ? "bg-blue-100 text-blue-700 font-bold"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                        title="Herramienta Selección"
                      >
                        <MousePointer2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("pan")}
                        className={`p-1.5 rounded-lg active:scale-95 transition-all ${
                          mode === "pan"
                            ? "bg-blue-100 text-blue-700 font-bold"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                        title="Herramienta Mano (Mover lienzo)"
                      >
                        <Hand className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Zoom slider y botones */}
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                        className="p-1 rounded-full hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"
                        title="Disminuir Zoom"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
                        className="p-1 rounded-full hover:bg-slate-100 text-slate-600 active:scale-95 transition-transform"
                        title="Aumentar Zoom"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-slate-700 min-w-[36px] text-right">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* 4. Floating Coordinates & Properties Panel (Bottom Left/Center) - Removed header and Canvas inputs */}
                  {designs[activeDesignIdx] && (
                    <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200/50 z-10 transition-all hover:bg-white pointer-events-auto">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Técnica de Personalización */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Técnica</label>
                          <select 
                            value={designs[activeDesignIdx].techniqueName} 
                            onChange={(e) => handleDesignChange(activeDesignIdx, "techniqueName", e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                          >
                            <option value="DTF">DTF</option>
                            <option value="Bordado">Bordado</option>
                            <option value="Serigrafía">Serigrafía</option>
                            <option value="Sublimado">Sublimado</option>
                          </select>
                        </div>

                        {/* Dimensiones (Ancho y Alto) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Ancho (px)</label>
                            <Input 
                              type="number"
                              value={Math.round(designs[activeDesignIdx].width)}
                              onChange={(e) => handleDesignChange(activeDesignIdx, "width", parseInt(e.target.value) || 0)}
                              className="h-9 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Alto (px)</label>
                            <Input 
                              type="number"
                              value={Math.round(designs[activeDesignIdx].height)}
                              onChange={(e) => handleDesignChange(activeDesignIdx, "height", parseInt(e.target.value) || 0)}
                              className="h-9 text-xs font-semibold"
                            />
                          </div>
                        </div>

                        {/* Coordenadas de Posición */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Pos X (px)</label>
                            <Input 
                              type="number"
                              value={Math.round(designs[activeDesignIdx].positionX)}
                              onChange={(e) => handleDesignChange(activeDesignIdx, "positionX", parseInt(e.target.value) || 0)}
                              className="h-9 text-xs font-semibold bg-slate-50/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Pos Y (px)</label>
                            <Input 
                              type="number"
                              value={Math.round(designs[activeDesignIdx].positionY)}
                              onChange={(e) => handleDesignChange(activeDesignIdx, "positionY", parseInt(e.target.value) || 0)}
                              className="h-9 text-xs font-semibold bg-slate-50/50"
                            />
                          </div>
                        </div>

                        {/* Rotación */}
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-400 block mb-1 uppercase tracking-wider">Rotación (°)</label>
                          <Input 
                            type="number"
                            value={Math.round(designs[activeDesignIdx].rotation)}
                            onChange={(e) => handleDesignChange(activeDesignIdx, "rotation", parseInt(e.target.value) || 0)}
                            className="h-9 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Floating View Tabs (Top Center) - Centered relative to entire container, outside the visibility area wrapper */}
                {designs.length > 1 && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-200/50 flex gap-1.5 z-10 transition-all hover:bg-white">
                    {designs.map((d, index) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setActiveDesignIdx(index)}
                        className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                          activeDesignIdx === index
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {d.placement === "FRONT" ? "Frontal" : d.placement === "BACK" ? "Espalda" : d.placement === "LEFTSLEEVE" ? "Manga Izq." : "Manga Der."}
                      </button>
                    ))}
                  </div>
                )}

                {/* 5. Floating Sidebar Accordion Panel (Right Side) */}
                <div className="absolute right-6 top-6 bottom-6 w-80 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/50 flex flex-col justify-between p-6 z-10 overflow-y-auto transition-all hover:bg-white select-none">
                  <div className="space-y-4">
                    {/* CATEGORÍA 1: Subir Diseño */}
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
                      <button
                        type="button"
                        onClick={() => setOpenSection(openSection === "Upload Design" ? null : "Upload Design")}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className="font-extrabold text-slate-800 text-sm">Subir Diseño</span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openSection === "Upload Design" ? "transform rotate-90" : ""}`} />
                      </button>
                      {openSection === "Upload Design" && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer relative group">
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg"
                              onChange={handleLogoUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Upload className="h-7 w-7 text-slate-400 group-hover:text-blue-500 mb-1.5 transition-colors" />
                            <p className="text-[11px] font-bold text-slate-650">Subir imagen PNG o JPG</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Formatos de alta calidad</p>
                          </div>

                          {designs[activeDesignIdx] && designs[activeDesignIdx].logoUrl && (
                            <div className="bg-slate-100 rounded-lg p-2.5 flex items-center justify-between border border-slate-200">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-8 h-8 rounded bg-white flex items-center justify-center shrink-0 overflow-hidden">
                                  <img src={designs[activeDesignIdx].logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 truncate">Logo cargado</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDesignChange(activeDesignIdx, "logoUrl", "")}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                                title="Eliminar Logo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CATEGORÍA 2: Vista */}
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
                      <button
                        type="button"
                        onClick={() => setOpenSection(openSection === "Garment" ? null : "Garment")}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className="font-extrabold text-slate-800 text-sm">Vista</span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openSection === "Garment" ? "transform rotate-90" : ""}`} />
                      </button>
                      {openSection === "Garment" && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          <div className="grid grid-cols-2 gap-2">
                            {(["FRONT", "BACK", "LEFTSLEEVE", "RIGHTSLEEVE"] as const).map((pos) => {
                              const activeDesign = designs[activeDesignIdx];
                              const isSelected = activeDesign?.placement === pos;
                              const label = pos === "FRONT" ? "Frontal" : pos === "BACK" ? "Espalda" : pos === "LEFTSLEEVE" ? "Manga Izq." : "Manga Der.";
                              const garmentUrl = getGarmentImageForPlacement(pos, selectedProduct, "");
                              
                              return (
                                <button
                                  key={pos}
                                  type="button"
                                  onClick={() => selectOrCreatePlacement(pos)}
                                  className={`p-2 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/10"
                                      : "border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <div className="w-8 h-8 bg-slate-50 rounded overflow-hidden flex items-center justify-center shrink-0">
                                    {garmentUrl ? (
                                      <img src={garmentUrl} alt={label} className="max-w-full max-h-full object-contain" />
                                    ) : (
                                      <Shirt className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <span className={`text-[9px] font-extrabold ${isSelected ? "text-blue-700" : "text-slate-600"}`}>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CATEGORÍA 3: Fondo */}
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
                      <button
                        type="button"
                        onClick={() => setOpenSection(openSection === "Background" ? null : "Background")}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className="font-extrabold text-slate-800 text-sm">Fondo</span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openSection === "Background" ? "transform rotate-90" : ""}`} />
                      </button>
                      {openSection === "Background" && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { name: "Oscuro", url: "https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/imagenes-coremen/blackwall.jpg" },
                              { name: "Gris", url: "https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/imagenes-coremen/greywall.jpg" },
                              { name: "Blanco", url: "https://amazon-s3-coremen-bucket.s3.us-east-1.amazonaws.com/imagenes-coremen/whitewall.jpg" },
                            ].map((bg) => {
                              const isSelected = activeBgUrl === bg.url;
                              return (
                                <div key={bg.name} className="flex flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setActiveBgUrl(bg.url)}
                                    className={`w-full h-12 rounded-xl border-2 transition-all overflow-hidden bg-cover bg-center ${
                                      isSelected 
                                        ? "border-blue-500 scale-105 shadow-sm" 
                                        : "border-slate-200 hover:border-slate-300"
                                    }`}
                                    style={{ backgroundImage: `url(${bg.url})` }}
                                    title={bg.name}
                                  />
                                  <span className="text-[10px] font-bold text-slate-500">{bg.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CATEGORÍA 4: Avanzado */}
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
                      <button
                        type="button"
                        onClick={() => setOpenSection(openSection === "Advanced" ? null : "Advanced")}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className="font-extrabold text-slate-800 text-sm">Avanzado</span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openSection === "Advanced" ? "transform rotate-90" : ""}`} />
                      </button>
                      {openSection === "Advanced" && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                          {/* Medidas de Canvas (Estático) */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Medidas de Canvas</span>
                            <div className="flex gap-4 text-xs font-bold text-slate-700 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-normal">Ancho</span>
                                <span>520 px</span>
                              </div>
                              <div className="border-r border-slate-200" />
                              <div>
                                <span className="text-[10px] text-slate-400 block font-normal">Alto</span>
                                <span>520 px</span>
                              </div>
                            </div>
                          </div>

                          {/* Checkbox Efecto de Tela */}
                          <div className="flex items-center gap-2.5 pt-1.5">
                            <input
                              type="checkbox"
                              id="efectoTelaMock"
                              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                              checked={isSimulationActive}
                              onChange={(e) => setIsSimulationActive(e.target.checked)}
                            />
                            <label htmlFor="efectoTelaMock" className="text-xs font-extrabold text-slate-700 cursor-pointer select-none">
                              Efecto de Tela
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                    <label className="text-xs font-bold text-slate-500">Valor Preciso de Cotización (S/) *</label>
                    <Input 
                      type="number" 
                      placeholder="Ej. 1250" 
                      value={price}
                      onChange={(e) => handleBasePriceChange(e.target.value)}
                      className="h-11 font-semibold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Tiempo de Producción (Días Hábiles) *</label>
                    <Input 
                      type="number"
                      placeholder="Ej. 5" 
                      value={estimatedDays}
                      onChange={(e) => setEstimatedDays(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* DESGLOSE DE DESCUENTOS APLICADOS */}
                {(discountDetails.showVolume || discountDetails.showSeason) && (
                  <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-2 mt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-1">
                      <Banknote className="w-3.5 h-3.5" /> Descuentos Aplicados
                    </p>
                    {discountDetails.showVolume && (
                      <div className="flex justify-between items-center text-xs text-amber-900">
                        <span>Descuento por cantidad ({totalQuantity} unidades):</span>
                        <span className="font-bold">-{discountDetails.volumePct}%</span>
                      </div>
                    )}
                    {discountDetails.showSeason && (
                      <div className="flex justify-between items-center text-xs text-amber-900">
                        <span>Descuento de temporada ({discountDetails.seasonDiscount?.name}):</span>
                        <span className="font-bold">-{discountDetails.seasonPct}%</span>
                      </div>
                    )}
                    <div className="border-t border-amber-200/50 pt-2 flex justify-between items-center text-amber-900 font-bold text-xs mt-1">
                      <span>
                        {discountDetails.combinedType === 'accumulative' ? (
                          <span className="text-[10px] text-amber-600 font-normal italic">(Descuentos acumulados)</span>
                        ) : discountDetails.combinedType === 'max' ? (
                          <span className="text-[10px] text-amber-600 font-normal italic">(Se aplica el mayor, no acumulativo)</span>
                        ) : null}{" "}
                        Descuento Total:
                      </span>
                      <span>-{discountDetails.totalDiscountPct}%</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Valor final a pagar por el Cliente (S/) *</label>
                  <Input 
                    type="number" 
                    placeholder="Ej. 1200" 
                    value={finalPrice} 
                    onChange={(e) => handleFinalPriceChange(e.target.value)} 
                    className="h-11 bg-green-50/20 border-green-200 focus:border-green-500 text-green-700 font-bold text-base"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Precio final calculado aplicando los descuentos.</span>
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
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-slate-200 py-4 px-6 z-20 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between gap-4">
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
