"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Minus, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";

// Konva must be loaded client-side only (no SSR)
const Stage = dynamic(() => import("react-konva").then(m => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then(m => m.Layer), { ssr: false });
const KonvaImage = dynamic(() => import("react-konva").then(m => m.Image), { ssr: false });
const Rect = dynamic(() => import("react-konva").then(m => m.Rect), { ssr: false });
const Transformer = dynamic(() => import("react-konva").then(m => m.Transformer), { ssr: false });

const SESSION_KEY = "customization-session-state";
const ALLOWED_EXIT_KEY = "customization-allowed-exit";
const EXIT_CONFIRMATION = "¿Deseas salir? El diseño no guardado se perderá.";

const ZONES = [
  { id: "chest", label: "Pecho", x: 160, y: 160, w: 130, h: 130 },
  { id: "back", label: "Espalda", x: 160, y: 160, w: 130, h: 130 },
  { id: "arm", label: "Brazo", x: 305, y: 165, w: 95, h: 95 },
];

type ZoneId = "chest" | "back" | "arm";
type TransformState = { x: number; y: number; scaleX: number; scaleY: number; rotation: number };
type ZoneTransformMap = Record<ZoneId, TransformState>;

const DEFAULT_TRANSFORM: TransformState = { x: 195, y: 190, scaleX: 0.35, scaleY: 0.35, rotation: 0 };

const initialTransforms: ZoneTransformMap = {
  chest: { ...DEFAULT_TRANSFORM },
  back: { ...DEFAULT_TRANSFORM },
  arm: { x: 330, y: 190, scaleX: 0.25, scaleY: 0.25, rotation: 0 },
};

function PersonalizarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get("productId") || "";

  // React Query for base products and techniques
  const { data: products } = useQuery<any>({
    queryKey: ["products"],
    queryFn: () => apiGet("/api/products"),
  });

  const { data: attributes } = useQuery<any>({
    queryKey: ["admin-attributes"],
    queryFn: () => apiGet("/api/admin/attributes"),
  });

  const techniques = attributes?.techniques || [];

  // Form selections states
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedTechniqueId, setSelectedTechniqueId] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [message, setMessage] = useState("");

  const [designUrl, setDesignUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const rawState = window.sessionStorage.getItem(SESSION_KEY);
    if (!rawState) return null;
    try {
      const parsed = JSON.parse(rawState) as { designUrl?: string };
      return parsed.designUrl ?? null;
    } catch {
      return null;
    }
  });

  const [zone, setZone] = useState<ZoneId>(() => {
    if (typeof window === "undefined") return "chest";
    const rawState = window.sessionStorage.getItem(SESSION_KEY);
    if (!rawState) return "chest";
    try {
      const parsed = JSON.parse(rawState) as { zone?: ZoneId };
      return parsed.zone ?? "chest";
    } catch {
      return "chest";
    }
  });

  const [uploading, setUploading] = useState(false);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [transformsByZone, setTransformsByZone] = useState<ZoneTransformMap>(() => {
    if (typeof window === "undefined") return initialTransforms;
    const rawState = window.sessionStorage.getItem(SESSION_KEY);
    if (!rawState) return initialTransforms;
    try {
      const parsed = JSON.parse(rawState) as { transformsByZone?: ZoneTransformMap };
      return parsed.transformsByZone ?? initialTransforms;
    } catch {
      return initialTransforms;
    }
  });

  const imageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  const hasUnsavedDesign = Boolean(designUrl);

  // Sync to active product options
  useEffect(() => {
    if (products && products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const activeProduct = products?.find((p: any) => p.id === selectedProductId) || products?.[0];

  // Auto-select first variant color and size
  useEffect(() => {
    if (activeProduct) {
      const colors = Array.from(new Map(activeProduct.variants?.map((v: any) => [v.color?.id, v.color])).values()).filter(Boolean) as any[];
      const sizes = Array.from(new Set(activeProduct.variants?.map((v: any) => v.size?.value))).filter(Boolean) as string[];

      if (colors.length > 0 && !selectedColor) {
        setSelectedColor(colors[0].name);
      }
      if (sizes.length > 0 && !selectedSize) {
        setSelectedSize(sizes[0]);
      }
    }
  }, [activeProduct, selectedColor, selectedSize]);

  // Auto-select technique
  useEffect(() => {
    if (techniques.length > 0 && !selectedTechniqueId) {
      setSelectedTechniqueId(techniques[0].id);
    }
  }, [techniques, selectedTechniqueId]);

  useEffect(() => {
    if (!designUrl) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ designUrl, zone, transformsByZone })
    );
  }, [designUrl, zone, transformsByZone]);

  useEffect(() => {
    if (!designUrl) return;
    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.src = designUrl;
    nextImage.onload = () => setLoadedImage(nextImage);
  }, [designUrl]);

  useEffect(() => {
    if (!loadedImage || !imageRef.current || !transformerRef.current) return;
    transformerRef.current.nodes([imageRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [zone, loadedImage]);

  useEffect(() => {
    if (!hasUnsavedDesign) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = EXIT_CONFIRMATION;
    };

    const clearSessionDesign = () => {
      window.sessionStorage.removeItem(SESSION_KEY);
      setDesignUrl(null);
      setTransformsByZone(initialTransforms);
    };

    const handleAnchorNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      if (href.startsWith("/personalizar")) return;
      if (window.sessionStorage.getItem(ALLOWED_EXIT_KEY) === "1") return;

      const shouldLeave = window.confirm(EXIT_CONFIRMATION);
      if (!shouldLeave) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      clearSessionDesign();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorNavigation, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorNavigation, true);
    };
  }, [hasUnsavedDesign]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/jpeg") {
      window.alert("Solo se permiten archivos JPG/JPEG");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("designImage", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/customization/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (data.imageUrl) setDesignUrl(data.imageUrl);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Error al subir imagen");
    }
    setUploading(false);
  };

  const updateZoneTransform = (nextValues: Partial<TransformState>) => {
    setTransformsByZone((prev) => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        ...nextValues,
      },
    }));
  };

  // Find dynamic variant
  const selectedVariant = activeProduct?.variants?.find(
    (v: any) => v.color?.name === selectedColor && v.size?.value === selectedSize
  );

  const createQuote = useMutation({
    mutationFn: (payload: any) => apiPost("/api/quotes", payload),
    onSuccess: () => {
      toast.success("Cotización solicitada con éxito.");
      window.sessionStorage.removeItem(SESSION_KEY);
      window.sessionStorage.setItem(ALLOWED_EXIT_KEY, "1");
      router.push("/cotizaciones");
    },
    onError: (err: any) => {
      toast.error("Error al crear cotización", { description: err.message });
    }
  });

  const handleSubmitQuote = () => {
    if (!selectedVariant) {
      toast.error("Por favor, selecciona una variante (color y talla) válida.");
      return;
    }
    if (!designUrl) {
      toast.error("Por favor, sube un diseño antes de continuar.");
      return;
    }
    if (!selectedTechniqueId) {
      toast.error("Por favor, selecciona una técnica de estampado.");
      return;
    }

    const placementMap: Record<ZoneId, string> = {
      chest: "FRONT",
      back: "BACK",
      arm: "LEFTSLEEVE",
    };

    const payload = {
      totalQuantity: Number(quantity),
      message: message || undefined,
      items: [
        {
          productVariantId: selectedVariant.id,
          quantity: Number(quantity),
        }
      ],
      designs: [
        {
          placement: placementMap[zone] || "FRONT",
          techniqueId: selectedTechniqueId,
          baseGarmentUrl: activeProduct?.images?.[0]?.url || "/prenda-base.png",
          logoUrl: designUrl,
          positionX: activeTransform.x,
          positionY: activeTransform.y,
          width: loadedImage ? (loadedImage.width * activeTransform.scaleX) : 100,
          height: loadedImage ? (loadedImage.height * activeTransform.scaleY) : 100,
          rotation: activeTransform.rotation,
          canvasWidth: 450,
          canvasHeight: 480,
        }
      ]
    };

    createQuote.mutate(payload);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedColor("");
    setSelectedSize("");
  };

  const activeZone = ZONES.find((z) => z.id === zone)!;
  const activeTransform = transformsByZone[zone];
  const productColors = activeProduct ? Array.from(new Map(activeProduct.variants?.map((v: any) => [v.color?.id, v.color])).values()).filter(Boolean) as any[] : [];
  const productSizes = activeProduct ? Array.from(new Set(activeProduct.variants?.map((v: any) => v.size?.value))).filter(Boolean) as string[] : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/catalogo">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Personalizar Prenda</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-4">
              <div className="bg-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden" style={{ height: 500 }}>
                {typeof window !== "undefined" && Stage ? (
                  <Stage width={450} height={480}>
                    <Layer>
                      {/* Background garment placeholder */}
                      <Rect x={100} y={20} width={250} height={440} fill="#e2e8f0" cornerRadius={12} />
                      <Rect x={125} y={60} width={200} height={350} fill="#f1f5f9" cornerRadius={8} />
                      <Rect x={activeZone.x} y={activeZone.y} width={activeZone.w} height={activeZone.h} dash={[7, 5]} stroke="#3b82f6" strokeWidth={1.5} cornerRadius={8} />

                      {designUrl && loadedImage ? (
                        <>
                          <KonvaImage
                            ref={imageRef}
                            image={loadedImage}
                            x={activeTransform.x}
                            y={activeTransform.y}
                            width={loadedImage.width}
                            height={loadedImage.height}
                            scaleX={activeTransform.scaleX}
                            scaleY={activeTransform.scaleY}
                            rotation={activeTransform.rotation}
                            draggable
                            onDragEnd={(event: any) => {
                              updateZoneTransform({ x: event.target.x(), y: event.target.y() });
                            }}
                            onTransformEnd={(event: any) => {
                              const node = event.target;
                              updateZoneTransform({
                                x: node.x(),
                                y: node.y(),
                                scaleX: node.scaleX(),
                                scaleY: node.scaleY(),
                                rotation: node.rotation(),
                              });
                            }}
                          />
                          <Transformer
                            ref={transformerRef}
                            rotateEnabled
                            enabledAnchors={[
                              "top-left",
                              "top-right",
                              "bottom-left",
                              "bottom-right",
                            ]}
                            boundBoxFunc={(_, newBox: any) => {
                              if (newBox.width < 20 || newBox.height < 20) return _;
                              return newBox;
                            }}
                          />
                        </>
                      ) : null}
                    </Layer>
                  </Stage>
                ) : (
                  <p className="text-gray-400">Cargando canvas...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Product Selectors */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader><CardTitle className="text-base text-slate-800 font-semibold">1. Configurar Prenda</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Product selection if multiple are available */}
              {products && products.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Prenda Base</label>
                  <select 
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                  >
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Color selector */}
              {productColors.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {productColors.map((color: any) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColor(color.name)}
                        className={`h-9 px-3 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 ${
                          selectedColor === color.name
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: color.hexCode }} />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size selector */}
              {productSizes.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Talla</label>
                  <div className="flex flex-wrap gap-2">
                    {productSizes.map((size: string) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`w-9 h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center ${
                          selectedSize === size
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Design */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader><CardTitle className="text-base text-slate-800 font-semibold">2. Subir Diseño</CardTitle></CardHeader>
            <CardContent>
              <Input type="file" accept="image/jpeg" onChange={handleUpload} disabled={uploading} className="rounded-xl border-slate-200 cursor-pointer" />
              {uploading && <p className="text-xs text-blue-500 mt-2 animate-pulse">Subiendo diseño...</p>}
              {designUrl && <p className="text-xs text-green-600 mt-2 font-medium">✓ Diseño cargado con éxito</p>}
              <p className="text-[10px] text-slate-400 mt-2">Solo formato JPG, máximo 20MB</p>
            </CardContent>
          </Card>

          {/* Stamping details */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader><CardTitle className="text-base text-slate-800 font-semibold">3. Personalización</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Zone */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Zona de Estampado</label>
                <div className="grid grid-cols-3 gap-2">
                  {ZONES.map((z) => (
                    <Button key={z.id} variant={zone === z.id ? "default" : "outline"} size="sm" onClick={() => setZone(z.id as ZoneId)} className="w-full text-xs rounded-xl">
                      {z.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Printing technique */}
              {techniques.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Técnica de Estampado</label>
                  <select 
                    value={selectedTechniqueId}
                    onChange={(e) => setSelectedTechniqueId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                  >
                    {techniques.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} {t.description ? `(${t.description})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Quote */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-slate-50">
            <CardHeader><CardTitle className="text-base text-slate-800 font-semibold">4. Cantidad & Comentarios</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Quantity */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cantidad (B2B)</label>
                <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-sm">
                  <button 
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-12 text-center font-bold text-slate-900 text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Instrucciones Adicionales</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detalles sobre el diseño, colores adicionales o requerimientos de entrega..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Submit CTA */}
              <Button 
                className="w-full h-12 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]" 
                disabled={!designUrl || createQuote.isPending} 
                onClick={handleSubmitQuote}
              >
                {createQuote.isPending ? "Solicitando..." : "Solicitar Cotización de Lote"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function PersonalizarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Cargando personalizador...</div>}>
      <PersonalizarContent />
    </Suspense>
  );
}
