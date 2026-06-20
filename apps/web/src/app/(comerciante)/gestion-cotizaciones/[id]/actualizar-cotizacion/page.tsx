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
  ArrowLeft
} from "lucide-react";

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

  // Fetch initial quote detail
  const { data: quote, isLoading } = useQuery<any>({
    queryKey: ["quote-detail-edit", id],
    queryFn: async () => {
      if (!id) return null;
      return apiGet(`/api/merchant/quotes/${id}`);
    },
    enabled: !!id 
  });

  // Load initial states when quote loads
  useEffect(() => {
    if (quote) {
      setGarmentType(quote.items?.[0]?.productVariant?.product?.name || quote.garmentType || "Polo Básico");
      setFabricType(quote.items?.[0]?.productVariant?.product?.fabric?.value || quote.fabricType || "Algodón");
      setPrice(quote.estimatedPrice || quote.quotedPrice ? String(quote.estimatedPrice || quote.quotedPrice) : "");
      setMessage(quote.merchantMessage || "");
      setEstimatedDays("");
      
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
        })));
      }
    }
  }, [quote]);

  // Respond / Update quote mutation
  const respondMutation = useMutation({
    mutationFn: (data: { quotedPrice: number; merchantMessage?: string }) => 
      apiPatch(`/api/merchant/quotes/${id}/respond`, data),
    onSuccess: () => {
      toast.success("Propuesta de cotización actualizada con éxito");
      router.push(`/gestion-cotizaciones/${id}`);
    },
    onError: (err: any) => {
      toast.error("Error al actualizar la cotización", { description: err.message });
    }
  });

  // Extract unique sizes and colors from the quote items
  const uniqueSizes = useMemo(() => {
    if (!quote?.items) return [];
    const sizesMap = new Map<string, { id: string; name: string; abbreviation: string }>();
    quote.items.forEach((item: any) => {
      const sz = item.productVariant?.size;
      if (sz && !sizesMap.has(sz.id)) {
        sizesMap.set(sz.id, sz);
      }
    });
    const standardOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    return Array.from(sizesMap.values()).sort((a, b) => {
      const idxA = standardOrder.indexOf(a.abbreviation);
      const idxB = standardOrder.indexOf(b.abbreviation);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [quote?.items]);

  const uniqueColors = useMemo(() => {
    if (!quote?.items) return [];
    const colorsMap = new Map<string, { id: string; name: string; hex: string }>();
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
    return Array.from(colorsMap.values());
  }, [quote?.items]);

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

    respondMutation.mutate({
      quotedPrice: Number(price),
      merchantMessage: fullMessage,
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-2">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Paso 1: Detalles del Producto Solicitado</h3>
                <p className="text-xs text-slate-500">Define o edita la prenda base y el tipo de material textil.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Prenda Base *</label>
                <Input 
                  value={garmentType} 
                  onChange={(e) => setGarmentType(e.target.value)} 
                  placeholder="Ej. Polo Cuello Camisero"
                  className="h-11"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Tipo de Tela *</label>
                <Input 
                  value={fabricType} 
                  onChange={(e) => setFabricType(e.target.value)} 
                  placeholder="Ej. Piqué 24/1"
                  className="h-11"
                />
              </div>
            </div>
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
