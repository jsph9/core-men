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
  FileText,
  Handshake,
  Check,
  Scale,
  ClipboardCheck
} from "lucide-react";

const formatStepperDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} - ${hours}:${minutes}`;
};

const getActiveStep = (status: string): number => {
  switch (status) {
    case "PENDING":
      return 1;
    case "QUOTED":
      return 2;
    case "APPROVED":
    case "REJECTED":
    case "UNFEASIBLE":
      return 3;
    default:
      return 0;
  }
};

const stepperSteps = [
  { label: "No Visitado", icon: Eye },
  { label: "Revisado", icon: Search },
  { label: "Viabilidad", icon: Scale },
  { label: "Estado Cotización", icon: ClipboardCheck },
];

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

  // Controla qué vista se muestra en el cuadro grande
  const [selectedView, setSelectedView] = useState<"frontal" | "espalda" | "brazo_izq" | "brazo_der">("frontal");

  // Las 4 imágenes fijas (usamos tu prenda base para la frontal y placeholders para el resto por ahora)
  const mockViews = {
    frontal: "/prenda-base.png", 
    espalda: "/prenda-base2.png", 
    brazo_izq: "/prenda-base3.jpg",
    brazo_der: "/prenda-base4.jpg"
  };


  if (isLoading) return <div className="p-8 text-center text-slate-500 flex h-64 items-center justify-center">Cargando detalles...</div>;
  if (!quote) return <div className="p-8 text-center text-red-500 flex flex-col h-64 items-center justify-center gap-2">
    <p className="font-bold text-lg">Cotización no encontrada.</p>
    <Link href="/gestion-cotizaciones" className="mt-4 text-blue-500 underline">Volver a la bandeja</Link>
  </div>;

  // Mapa de productos base mock para redirección al catálogo
  const mockBaseProducts: Record<string, { id: string; name: string; basePrice: number; category: string; fabric: string; image: string }> = {
    "Polo Cuello Camisero": {
      id: "polo-camisero-id",
      name: "Polo Cuello Camisero",
      basePrice: 35.00,
      category: "Polos",
      fabric: "Piqué",
      image: "/prenda-base.png"
    },
    "Polera Oversize": {
      id: "polera-oversize-id",
      name: "Polera Oversize",
      basePrice: 55.00,
      category: "Poleras",
      fabric: "Franela",
      image: "/prenda-base2.png"
    },
    "Casaca Cortaviento": {
      id: "casaca-cortaviento-id",
      name: "Casaca Cortaviento",
      basePrice: 75.00,
      category: "Casacas",
      fabric: "Taslan",
      image: "/prenda-base3.jpg"
    },
    "Polo Básico": {
      id: "polo-basico-id",
      name: "Polo Básico",
      basePrice: 25.00,
      category: "Polos",
      fabric: "Jersey",
      image: "/prenda-base.png"
    }
  };

  const garmentType = quote.garmentType || "Polo Cuello Camisero";
  const baseProduct = mockBaseProducts[garmentType] || {
    id: "polo-camisero-id",
    name: garmentType,
    basePrice: quote.quotedPrice ? Number(quote.quotedPrice) * 0.7 : 35.00,
    category: "Prendas",
    fabric: quote.fabricType || "Textil",
    image: "/prenda-base.png"
  };

  const clientName = quote.client?.name || "Cliente General";
  const initials = clientName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const rawPhone = quote.client?.whatsappNumber || "999999999";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/51${cleanPhone}?text=${encodeURIComponent(`Hola ${clientName}, me contacto por la cotización #${id?.slice(0, 6).toUpperCase()} en CoreMen.`)}`;

  return (
    // Contenedor principal ajustado para que el footer "sticky" funcione perfectamente
    <div className="font-sans w-full relative flex flex-col min-h-[calc(100vh-4rem)]">
      
      <div className="flex-1 pb-8">
        {/* Breadcrumb & Stepper */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 flex flex-col gap-6 shadow-sm mx-6 mt-6">
          {/* Fila superior: Breadcrumb y Título */}
          <div className="flex items-center gap-4">
            <Link href="/gestion-cotizaciones" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Cotizaciones {'>'} <span className="font-semibold text-slate-900">Cotización #{id?.slice(0, 6).toUpperCase()}</span></p>
              <h1 className="text-2xl font-bold text-[#0F172A]">Detalle de Cotización</h1>
            </div>
          </div>

          {/* Información del Cliente y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:gap-x-12 gap-y-4 px-1 py-1 text-slate-700">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cliente Solicitante</p>
              <p className="text-base font-bold text-slate-800">{clientName}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha de Creación</p>
              <p className="text-base font-bold text-slate-800">
                {quote?.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "Fecha no disponible"}
              </p>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center w-full max-w-4xl mx-auto py-2">
              {stepperSteps.map((step, idx) => {
                const activeStep = getActiveStep(quote?.status);
                const isCompleted = idx < activeStep;
                const isActive = idx === activeStep;
                const isPending = idx > activeStep;
                const StepIcon = step.icon;

                // Determinar el texto secundario dinámico
                let secondaryText = "Pendiente";
                let secondaryTextColor = "text-slate-400";

                if (isCompleted) {
                  if (idx === 0 && quote?.createdAt) {
                    secondaryText = formatStepperDate(quote.createdAt);
                  } else {
                    secondaryText = "Completado";
                  }
                  secondaryTextColor = "text-slate-500";
                } else if (isActive) {
                  secondaryTextColor = "text-[#A0522D] font-semibold";
                  if (quote?.status === "APPROVED") {
                    secondaryText = "Aprobado";
                    secondaryTextColor = "text-emerald-600 font-semibold";
                  } else if (quote?.status === "REJECTED") {
                    secondaryText = "Rechazado";
                    secondaryTextColor = "text-red-600 font-semibold";
                  } else if (quote?.status === "UNFEASIBLE") {
                    secondaryText = "No Viable";
                    secondaryTextColor = "text-amber-600 font-semibold";
                  } else {
                    secondaryText = "En progreso...";
                  }
                }

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center relative">
                    {/* Conector izquierdo */}
                    {idx > 0 && (
                      <div 
                        className={`absolute left-0 right-1/2 top-6 h-[4px] -translate-y-1/2 z-0 transition-all duration-500 ${
                          isCompleted || isActive ? "bg-[#A0522D]" : "bg-slate-200"
                        }`}
                      />
                    )}
                    {/* Conector derecho */}
                    {idx < stepperSteps.length - 1 && (
                      <div 
                        className={`absolute left-1/2 right-0 top-6 h-[4px] -translate-y-1/2 z-0 transition-all duration-500 ${
                          isCompleted ? "bg-[#A0522D]" : "bg-slate-200"
                        }`}
                      />
                    )}

                    {/* Círculo del paso */}
                    {isCompleted ? (
                      <div className="relative z-10 flex items-center justify-center w-12 h-12">
                        <div className="w-9 h-9 rounded-full bg-[#A0522D] text-white flex items-center justify-center shadow-md">
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : isActive ? (
                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-orange-100/70 border border-orange-200/50 shadow-sm">
                        <div className="w-9 h-9 rounded-full bg-[#A0522D] text-white flex items-center justify-center shadow-md animate-pulse-subtle">
                          <StepIcon className="w-4.5 h-4.5" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative z-10 flex items-center justify-center w-12 h-12">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center">
                          <StepIcon className="w-4.5 h-4.5" />
                        </div>
                      </div>
                    )}

                    {/* Nombres principales y secundarios */}
                    <div className="text-center mt-3 px-1">
                      <p className={`text-sm font-bold leading-tight ${isPending ? "text-slate-400" : "text-slate-800"}`}>
                        {step.label}
                      </p>
                      <p className={`text-[11px] mt-0.5 whitespace-nowrap ${secondaryTextColor}`}>
                        {secondaryText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
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
              
              <div className="p-5 flex-1 flex flex-col gap-3">
                {/* 1. IMAGEN PRINCIPAL (Altura fija de 350px para evitar que colapse) */}
                <div 
                  className="w-full bg-white rounded-lg border border-slate-200 flex items-center justify-center relative overflow-hidden"
                  style={{ height: '400px' }} 
                >
                  <img 
                    key={selectedView}
                    src={mockViews[selectedView]} 
                    alt={`Vista ${selectedView}`} 
                    // Cambiamos a object-contain absoluto para forzar proporción
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain', 
                      padding: '0rem' 
                    }}
                  />
                </div>

                {/* 2. LAS 4 MINIATURAS (Tamaño fijo de 5rem x 5rem) */}
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {(Object.keys(mockViews) as Array<keyof typeof mockViews>).map((view) => (
                    <div 
                      key={view}
                      onClick={() => setSelectedView(view)}
                      className={`h-20 w-20 bg-white rounded-lg border-2 cursor-pointer shrink-0 overflow-hidden relative transition-all flex items-center justify-center p-1 ${
                        selectedView === view 
                          ? 'border-blue-600 shadow-md' 
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <img 
                        src={mockViews[view]} 
                        alt={view} 
                        // Aplicamos object-contain y bloqueamos cualquier crecimiento fuera de la caja
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ))}
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
                  {quote.message ? `"${quote.message}"` : '"Sin observaciones adicionales proporcionadas por el cliente."'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <Link 
                    href={`/catalogo/${baseProduct.id}`}
                    className="bg-slate-900 rounded-lg p-4 text-white shadow-sm hover:bg-slate-800 transition-colors group cursor-pointer flex items-center gap-3 border border-slate-800"
                  >
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 shrink-0 overflow-hidden border border-slate-700 shadow-sm">
                      <img 
                        src={baseProduct.image} 
                        alt={baseProduct.name} 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mb-0.5">
                        PRODUCTO BASE • ID: {baseProduct.id.toUpperCase()}
                      </p>
                      <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {baseProduct.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {baseProduct.category} • {baseProduct.fabric}
                      </p>
                    </div>
                  </Link>
                  
                  <div className="bg-slate-900 rounded-lg p-4 text-white shadow-sm border border-slate-800">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Banknote className="w-3 h-3 text-blue-400" />
                      <p className="text-[10px] text-blue-300 font-semibold tracking-wider">VALOR DE COTIZACIÓN ESTIMADO</p>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTONERA INFERIOR: Contenedor sticky transparente de ancho completo para garantizar el seguimiento */}
      <div className="sticky bottom-0 w-full z-40 bg-transparent mt-auto">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.08),_0_-10px_15px_-3px_rgba(0,0,0,0.03)] mx-6 mb-6">
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
            Actualizar Información
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
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-3 text-slate-900 text-xl font-bold">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl shrink-0">
                <Handshake className="w-5 h-5" />
              </div>
              Iniciar Negociación Externa
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm leading-relaxed pt-2">
              Estás por iniciar una comunicación directa con el cliente. Utiliza este canal para coordinar los detalles finales, confirmar especificaciones de diseño y avanzar con la formalización de la cotización.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Contacto Responsable</span>
              {quote.client?.isVerified !== false && (
                <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                  Verificado
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-base shrink-0">
                {initials}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base leading-tight">{clientName}</h4>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  +51 {rawPhone}
                </p>
              </div>
            </div>
          </div>

          <button 
            className="w-full h-12 mt-4 bg-whatsapp hover:bg-whatsapp-dark text-white flex items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors shadow-sm cursor-pointer"
            onClick={() => window.open(whatsappUrl, "_blank")}
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.907.534 3.705 1.464 5.253L2 22l4.908-1.428a9.962 9.962 0 005.096 1.436c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm5.834 14.264c-.256.72-.98 1.284-1.724 1.488-.507.14-1.17.25-3.35-.612-2.784-1.1-4.577-3.92-4.717-4.108-.14-.188-1.133-1.503-1.133-2.867 0-1.364.713-2.035.966-2.307.253-.272.553-.34.74-.34.187 0 .374.003.535.011.166.008.39-.06.61.472.227.548.777 1.895.845 2.03.068.136.113.294.022.476-.09.182-.136.294-.272.453-.136.159-.286.355-.408.476-.136.136-.278.284-.12.556.158.272.705 1.157 1.51 1.874.805.717 1.48.937 1.747 1.073.267.136.42.114.578-.068.158-.182.68-.792.861-1.063.181-.271.363-.227.61-.136.248.09 1.574.743 1.846.879.271.136.452.204.52.317.068.113.068.653-.188 1.373z"/>
            </svg>
            Contactar por WhatsApp
          </button>

          <DialogFooter className="mt-4 flex justify-end">
            <Button 
              variant="ghost" 
              className="text-slate-600 hover:text-slate-900 text-sm font-semibold hover:bg-slate-50"
              onClick={() => setActiveModal(null)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}