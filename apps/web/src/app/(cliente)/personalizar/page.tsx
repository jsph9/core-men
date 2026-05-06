"use client";
import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Konva must be loaded client-side only (no SSR)
const Stage = dynamic(() => import("react-konva").then(m => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then(m => m.Layer), { ssr: false });
const KonvaImage = dynamic(() => import("react-konva").then(m => m.Image), { ssr: false });
const Rect = dynamic(() => import("react-konva").then(m => m.Rect), { ssr: false });
const Transformer = dynamic(() => import("react-konva").then(m => m.Transformer), { ssr: false });

const ZONES = [
  { id: "chest", label: "Pecho", x: 35, y: 25 },
  { id: "back", label: "Espalda", x: 35, y: 25 },
  { id: "left_arm", label: "Brazo Izq.", x: 10, y: 30 },
  { id: "right_arm", label: "Brazo Der.", x: 60, y: 30 },
];

export default function PersonalizarPage() {
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [zone, setZone] = useState("chest");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("designImage", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/customization/upload`, {
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
                  <Button key={z.id} variant={zone === z.id ? "default" : "outline"} size="sm" onClick={() => setZone(z.id)} className="w-full">
                    {z.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">3. Solicitar Cotización</CardTitle></CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" disabled={!designUrl}>
                Solicitar cotización con este diseño
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
