"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, 
  Download, 
  MessageSquare, 
  Eye,
  ChevronLeft,
  XCircle,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
  Banknote,
  FileText
} from "lucide-react";

export default function DetalleCotizacion() {
  const router = useRouter();
  const pathParams = useParams();
  const id = pathParams?.id as string;
  
  const [activeModal, setActiveModal] = useState<"RECHAZAR" | "ACEPTAR" | "WHATSAPP" | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: quote, isLoading } = useQuery<any>({
    queryKey: ["quote-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const allQuotes = await apiGet("/api/merchant/quotes");
      if (!Array.isArray(allQuotes)) return null;
      return allQuotes.find((q: any) => String(q.id).trim() === String(id).trim()) || null;
    },
    enabled: !!id 
  });

  const mockMatrix = [
    { id: 1, colorName: "Navy Blue", hex: "#1e3a8a", s: 25, m: 50, l: 50, xl: 25, total: 150 },
    { id: 2, colorName: "Optic White", hex: "#f8fafc", s: 50, m: 100, l: 100, xl: 50, total: 300 },
    { id: 3, colorName: "Heather Grey", hex: "#94a3b8", s: 10, m: 15, l: 15, xl: 10, total: 50 },
  ];

  const mockSpecs = [
    { id: 1, element: "Logotipo Principal", spec: "80mm x 45mm", location: "Pecho Izquierdo", method: "Bordado 3D", methodColor: "bg-blue-100 text-blue-700" },
    { id: 2, element: "Nombre Empleado", spec: "Tipografía Roboto", location: "Pecho Derecho", method: "Bordado Plano", methodColor: "bg-slate-200 text-slate-700" },
    { id: 3, element: "Logo Secundario", spec: "40mm Circular", location: "Manga Derecha", method: "Sublimado", methodColor: "bg-orange-100 text-orange-700" },
  ];

  if (isLoading) return <div className="p-8 text-center text-slate-500 flex h-64 items-center justify-center">Cargando detalles...</div>;
  if (!quote) return <div className="p-8 text-center text-red-500 flex flex-col h-64 items-center justify-center gap-2">
    <p className="font-bold text-lg">Cotización no encontrada.</p>
    <Link href="/gestion-cotizaciones" className="mt-4 text-blue-500 underline">Volver a la bandeja</Link>
  </div>;

  return (
    // Contenedor principal ajustado para que el footer "sticky" funcione perfectamente
    <div className="font-sans w-full relative flex flex-col min-h-[calc(100vh-4rem)]">
      
      <div className="flex-1 pb-8">
        {/* Breadcrumb */}
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 mb-6 flex items-center gap-4 shadow-sm mx-6 mt-6">
          <Link href="/gestion-cotizaciones" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Cotizaciones {'>'} <span className="font-semibold text-slate-900">Cotización #{id?.slice(0, 6).toUpperCase()}</span></p>
            <h1 className="text-2xl font-bold text-[#0F172A]">Detalle de Cotización</h1>
          </div>
        </div>

        <div className="space-y-6 mx-6">
          {/* ZONA BLANCA: DISEÑO SOLICITADO */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-orange-500" /> 
                  Diseño Solicitado por el Cliente
                </h3>
                <div className="flex gap-2 text-slate-400">
                  <button className="hover:text-slate-700 p-1"><Search className="h-4 w-4" /></button>
                  <button className="hover:text-slate-700 p-1"><Download className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                {/* Solución a imágenes aplastadas: min-h explícito y flex-col */}
                <div className="w-full bg-slate-100 rounded-lg min-h-[350px] flex flex-col items-center justify-center mb-4 relative overflow-hidden border border-slate-200">
                  {quote.designImageUrl ? (
                    <img src={quote.designImageUrl} alt="Diseño Principal" className="object-cover w-full h-full absolute inset-0" />
                  ) : (
                    <span className="text-slate-400 font-medium z-10 relative bg-slate-100/80 px-4 py-2 rounded">Render Final del Producto (Sin guías)</span>
                  )}
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-xs px-3 py-1.5 rounded text-slate-700 font-medium shadow-sm z-10">
                    Vista Frontal - {quote.garmentType} {quote.fabricType}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-16 w-16 bg-slate-200 rounded border-2 border-blue-500 cursor-pointer shrink-0"></div>
                  <div className="h-16 w-16 bg-slate-100 rounded border border-slate-200 cursor-pointer shrink-0"></div>
                  <div className="h-16 w-16 bg-slate-50 rounded border border-slate-200 cursor-pointer flex items-center justify-center text-slate-400 text-xl font-light shrink-0">+</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4"><div className="bg-blue-500 rounded-sm"></div><div className="bg-blue-500 rounded-sm"></div><div className="bg-blue-500 rounded-sm"></div><div className="bg-blue-500 rounded-sm"></div></div>
                  Matriz de Cantidades
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 font-semibold bg-slate-50 border-b border-slate-100 uppercase">
                      <tr>
                        <th className="py-3 px-2 whitespace-nowrap">Color / Talla</th>
                        <th className="py-3 px-2 text-center">S</th>
                        <th className="py-3 px-2 text-center">M</th>
                        <th className="py-3 px-2 text-center">L</th>
                        <th className="py-3 px-2 text-center">XL</th>
                        <th className="py-3 px-2 text-center font-bold text-slate-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mockMatrix.map(row => (
                        <tr key={row.id}>
                          <td className="py-3 px-2 flex items-center gap-2 whitespace-nowrap">
                            <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm shrink-0" style={{ backgroundColor: row.hex }}></div>
                            <span className="font-medium text-slate-700 text-xs">{row.colorName}</span>
                          </td>
                          <td className="py-3 px-2 text-center text-slate-600">{row.s}</td>
                          <td className="py-3 px-2 text-center text-slate-600">{row.m}</td>
                          <td className="py-3 px-2 text-center text-slate-600">{row.l}</td>
                          <td className="py-3 px-2 text-center text-slate-600">{row.xl}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-900">{row.total}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td className="py-3 px-2 text-slate-700 text-xs uppercase whitespace-nowrap">Totales por Talla</td>
                        <td className="py-3 px-2 text-center text-blue-700">85</td>
                        <td className="py-3 px-2 text-center text-blue-700">165</td>
                        <td className="py-3 px-2 text-center text-blue-700">165</td>
                        <td className="py-3 px-2 text-center text-blue-700">85</td>
                        <td className="py-3 px-2 text-center text-orange-600 text-lg">500</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex-1">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Observaciones del Cliente
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 border border-slate-100">
                  "{quote.message || "Sin observaciones adicionales proporcionadas por el cliente."}"
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-900 rounded-lg p-4 text-white shadow-sm">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider mb-1">COSTO BASE TOTAL</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white whitespace-nowrap">
                      S/ {quote.quotedPrice ? (Number(quote.quotedPrice) * 0.7).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
                
                <div className="bg-slate-900 rounded-lg p-4 text-white shadow-sm border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Banknote className="w-3 h-3 text-blue-400" />
                    <p className="text-[10px] text-blue-300 font-semibold tracking-wider">COSTO CON PERSONALIZACIÓN</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white whitespace-nowrap">
                      S/ {quote.quotedPrice ? Number(quote.quotedPrice).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* ZONA AZUL: ACERCA DE LA PERSONALIZACIÓN */}
          <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 mt-8">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-400" /> Acerca de la personalización
              </h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-5 flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-blue-600" /> Vista Previa de Diseño (Con guías)
                </h3>
                <div className="w-full bg-slate-100 rounded-lg min-h-[300px] flex flex-col items-center justify-center mb-4 relative overflow-hidden border border-dashed border-slate-300">
                  <div className="absolute border-2 border-dashed border-orange-500 w-32 h-20 bg-orange-500/10 flex items-center justify-center z-20">
                    <span className="text-[10px] font-bold text-orange-600 uppercase bg-white/80 px-1 rounded">Área de Bordado</span>
                  </div>
                  <span className="text-slate-400 z-10 relative bg-slate-100/80 px-4 py-2 rounded">Plantilla Base Técnica</span>
                </div>
                <div className="flex gap-3">
                  <div className="h-14 w-14 bg-slate-900 rounded border-2 border-orange-500 cursor-pointer shrink-0"></div>
                  <div className="h-14 w-14 bg-slate-100 rounded border border-slate-200 cursor-pointer shrink-0"></div>
                  <div className="h-14 w-14 bg-slate-50 rounded border border-slate-200 cursor-pointer flex items-center justify-center text-slate-400 shrink-0">+</div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl p-5 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-blue-600" /> Especificaciones Técnicas
                  </h3>
                  
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 font-semibold bg-slate-50 border-b border-slate-100 uppercase">
                        <tr>
                          <th className="py-2 px-2 whitespace-nowrap">Elemento</th>
                          <th className="py-2 px-2 whitespace-nowrap">Especificación</th>
                          <th className="py-2 px-2 whitespace-nowrap">Ubicación</th>
                          <th className="py-2 px-2 whitespace-nowrap">Método</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mockSpecs.map(spec => (
                          <tr key={spec.id}>
                            <td className="py-3 px-2 font-medium text-slate-800 whitespace-nowrap">{spec.element}</td>
                            <td className="py-3 px-2 text-slate-600 whitespace-nowrap">{spec.spec}</td>
                            <td className="py-3 px-2 text-slate-600 whitespace-nowrap">{spec.location}</td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${spec.methodColor}`}>
                                {spec.method}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded flex items-center justify-center p-1 shadow-sm shrink-0">
                         <div className="w-full h-full bg-blue-500 rounded-sm opacity-80"></div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Arte Original.png</p>
                        <p className="text-[10px] text-slate-500">2.4 MB • Alta Resolución</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1 shrink-0">
                      <Download className="h-3 w-3" /> Descargar Arte
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-2">
                  <p className="text-sm text-slate-300 font-medium">{quote.garmentType} Base - ID=12384</p>
                  <Button className="bg-[#B45309] hover:bg-[#92400E] text-white flex items-center gap-2 border-none shrink-0">
                    <Eye className="h-4 w-4" /> Ver Producto Base
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* BOTONERA INFERIOR: Cuadrícula uniforme para llenar todo el ancho */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Button 
            className="w-full h-12 text-base bg-red-600 hover:bg-red-700 text-white" 
            onClick={() => setActiveModal("RECHAZAR")}
          >
            Rechazar
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 text-base border-slate-300 text-slate-700 hover:bg-slate-50 font-medium" 
            onClick={() => router.push(`/gestion-cotizaciones/${id}/formalizar`)}
          >
            Formalizar Cotización
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-12 text-base border-slate-300 text-slate-700 hover:bg-slate-50 font-medium" 
            onClick={() => setActiveModal("WHATSAPP")}
          >
            Negociación Externa
          </Button>
          
          <Button 
            className="w-full h-12 text-base bg-emerald-500 hover:bg-emerald-600 text-white" 
            onClick={() => setActiveModal("ACEPTAR")}
          >
            Aceptar
          </Button>
          
        </div>
      </div>


      {/* MODALES */}
      <Dialog open={activeModal === "RECHAZAR"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><XCircle className="w-5 h-5" /> Rechazar Cotización</DialogTitle><DialogDescription>Indica el motivo de rechazo.</DialogDescription></DialogHeader>
          <div className="py-4"><Textarea placeholder="Motivo..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setActiveModal(null)}>Cancelar</Button><Button variant="destructive" disabled={!rejectReason}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "ACEPTAR"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-green-600 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Aceptar Cotización</DialogTitle><DialogDescription>Aprobarás esta cotización.</DialogDescription></DialogHeader>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setActiveModal(null)}>Cancelar</Button><Button className="bg-[#10B981] hover:bg-[#059669] text-white">Aprobar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "WHATSAPP"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-slate-800"><ExternalLink className="w-5 h-5 text-blue-500" /> Negociación Externa</DialogTitle></DialogHeader>
          <div className="py-6 flex flex-col items-center bg-slate-50 rounded-lg mt-2 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg">{quote.client?.name || "Cliente"}</h3>
            <Button className="w-full max-w-xs mt-4 bg-[#25D366] hover:bg-[#128C7E] text-white flex gap-2"><MessageSquare className="w-4 h-4" /> Abrir WhatsApp Web</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}