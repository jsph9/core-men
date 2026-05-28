"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

export default function PersonalizarPage() {
  const router = useRouter();
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
    if (!designUrl) {
      return;
    }
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

  const handleContinueToQuote = () => {
    window.sessionStorage.setItem(ALLOWED_EXIT_KEY, "1");
    router.push("/cotizaciones");
  };

  const activeZone = ZONES.find((z) => z.id === zone)!;
  const activeTransform = transformsByZone[zone];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Personalizar Prenda</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: 500 }}>
                {typeof window !== "undefined" && Stage ? (
                  <Stage width={450} height={480}>
                    <Layer>
                      {/* Background garment placeholder */}
                      <Rect x={100} y={20} width={250} height={440} fill="#e2e8f0" cornerRadius={12} />
                      <Rect x={125} y={60} width={200} height={350} fill="#f1f5f9" cornerRadius={8} />
                      <Rect x={activeZone.x} y={activeZone.y} width={activeZone.w} height={activeZone.h} dash={[7, 5]} stroke="#475569" cornerRadius={8} />

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
          <Card>
            <CardHeader><CardTitle className="text-base">1. Subir Diseño</CardTitle></CardHeader>
            <CardContent>
              <Input type="file" accept="image/jpeg" onChange={handleUpload} disabled={uploading} />
              {uploading && <p className="text-sm text-blue-500 mt-2">Subiendo...</p>}
              {designUrl && <p className="text-sm text-green-600 mt-2">✓ Diseño cargado</p>}
              <p className="text-xs text-gray-400 mt-2">Solo JPG, máximo 20MB</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">2. Zona de Impresión</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {ZONES.map((z) => (
                  <Button key={z.id} variant={zone === z.id ? "default" : "outline"} size="sm" onClick={() => setZone(z.id as ZoneId)} className="w-full">
                    {z.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">3. Solicitar Cotización</CardTitle></CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" disabled={!designUrl} onClick={handleContinueToQuote}>
                Solicitar cotización con este diseño
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
