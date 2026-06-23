"use client";
import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";

const CustomizerDinamico = dynamic(
  () => import("@/components/Customizer/Customizer"),
  { ssr: false }
);
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Search, 
  Download, 
  MessageSquare, 
  Eye,
  ChevronLeft,
  X,
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

const translateViabilityStatus = (status?: string) => {
  if (!status) return "Pendiente";
  switch (status) {
    case "PENDING": return "En progreso";
    case "VIABLE": return "Viable";
    case "NONVIABLE": return "Inviable";
    case "EXPIRED": return "Expirado";
    default: return "En progreso";
  }
};

const translateCustomerResponseStatus = (status?: string) => {
  if (!status) return "En progreso";
  switch (status) {
    case "PENDING": return "En progreso";
    case "CONFIRMED": return "Confirmado";
    case "REJECTED": return "Rechazado";
    case "UPDATED": return "Actualizado";
    case "IN_NEGOTIATION": return "En negociación";
    case "EXPIRED": return "Expirado";
    default: return "En progreso";
  }
};

const translateClientFormalizationStatus = (status?: string) => {
  if (!status) return "Pendiente";
  switch (status) {
    case "PENDING": return "En progreso";
    case "CONFIRMED": return "Confirmado";
    case "REJECTED": return "Rechazado";
    case "EXPIRED": return "Expirado";
    default: return "En progreso";
  }
};

const translatePlacement = (placement: string) => {
  switch (placement) {
    case "FRONT": return "Frontal";
    case "BACK": return "Espalda";
    case "RIGHTSLEEVE": return "Manga Derecha";
    case "LEFTSLEEVE": return "Manga Izquierda";
    default: return placement;
  }
};

const getTechniqueBadgeClass = (name: string) => {
  switch (name?.toUpperCase()) {
    case "BORDADO": return "bg-blue-100 text-blue-700 border border-blue-200";
    case "SUBLIMADO": return "bg-orange-100 text-orange-700 border border-orange-200";
    case "SERIGRAFÍA": return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "DTF": return "bg-purple-100 text-purple-700 border border-purple-200";
    default: return "bg-slate-100 text-slate-700 border border-slate-200";
  }
};

const getActiveStepIndex = (quote: any): number => {
  if (!quote) return 0;
  if (!quote.isVisited && quote.status === "PENDING") {
    return 0; // Visitado is active
  }
  if (quote.status === "CANCELLED") {
    // If it's cancelled, find where it was cancelled
    if (quote.viabilityStatus === "EXPIRED") {
      return 1; // Cancelled at step 2 (Expired)
    }
    if (quote.customerResponseStatus === "REJECTED" || quote.customerResponseStatus === "EXPIRED") {
      return 2; // Cancelled at step 3
    }
    if (quote.clientFormalizationStatus === "REJECTED" || quote.clientFormalizationStatus === "EXPIRED") {
      return 3; // Cancelled at step 4
    }
    // If quote is cancelled but viability is PENDING
    if (quote.viabilityStatus === "PENDING") {
      return 1;
    }
    return 2; // Default fallback if cancelled but validation was done
  }
  if (quote.viabilityStatus === "PENDING") {
    return 1; // Validación del Diseño is active
  }
  if (
    quote.customerResponseStatus === "PENDING" ||
    quote.customerResponseStatus === "IN_NEGOTIATION" ||
    quote.customerResponseStatus === "UPDATED"
  ) {
    return 2; // Estado de la Cotización is active
  }
  if (quote.clientFormalizationStatus === "PENDING") {
    return 3; // Confirmación de Cotización is active
  }
  return 4; // All steps completed
};

const getStepState = (idx: number, quote: any): "completed" | "current" | "cancelled" | "pending" => {
  if (!quote) return "pending";

  const activeStepIdx = getActiveStepIndex(quote);

  if (idx > activeStepIdx) {
    return "pending";
  }

  // Check if this specific step is cancelled/rejected
  if (idx === 1 && quote.viabilityStatus === "EXPIRED") {
    return "cancelled";
  }
  if (idx === 2 && (quote.customerResponseStatus === "REJECTED" || quote.customerResponseStatus === "EXPIRED")) {
    return "cancelled";
  }
  if (idx === 3 && (quote.clientFormalizationStatus === "REJECTED" || quote.clientFormalizationStatus === "EXPIRED")) {
    return "cancelled";
  }
  
  if (quote.status === "CANCELLED" && idx === activeStepIdx) {
    if (idx === 1 && quote.viabilityStatus === "PENDING") {
      return "cancelled";
    }
    if (idx !== 1) {
      return "cancelled";
    }
  }

  if (idx < activeStepIdx) {
    return "completed";
  }

  return "current";
};

const getStepDetails = (idx: number, quote: any) => {
  const state = getStepState(idx, quote);
  
  let statusText = "Pendiente";
  let historyDate = "";

  if (state === "pending") {
    statusText = "Pendiente";
  } else {
    if (idx === 0) {
      historyDate = getHistoryDate(quote, "STATUS", "IN_REVIEW");
      statusText = "Visitado";
    } else if (idx === 1) {
      statusText = translateViabilityStatus(quote?.viabilityStatus);
      historyDate = getHistoryDate(quote, "VIABILITY");
    } else if (idx === 2) {
      statusText = translateCustomerResponseStatus(quote?.customerResponseStatus);
      historyDate = getHistoryDate(quote, "CUSTOMER_RESPONSE");
    } else if (idx === 3) {
      statusText = translateClientFormalizationStatus(quote?.clientFormalizationStatus);
      historyDate = getHistoryDate(quote, "FORMALIZATION");
    }
  }

  let statusTextColor = "text-slate-400";
  if (state === "completed") {
    statusTextColor = "text-emerald-600 font-semibold";
  } else if (state === "current") {
    statusTextColor = "text-amber-600 font-semibold";
  } else if (state === "cancelled") {
    statusTextColor = "text-red-600 font-semibold";
  }

  return {
    state,
    statusText,
    statusTextColor,
    historyDate,
  };
};

const getLineColorClass = (stepState: "completed" | "current" | "cancelled" | "pending") => {
  switch (stepState) {
    case "completed": return "bg-emerald-500";
    case "current": return "bg-amber-500";
    case "cancelled": return "bg-red-500";
    case "pending": default: return "bg-slate-200";
  }
};

const getHistoryDate = (quote: any, changedField: string, newValue?: string) => {
  if (!quote) return "";
  if (quote.statusHistory && Array.isArray(quote.statusHistory)) {
    const log = quote.statusHistory.find((h: any) => {
      if (h.changedField !== changedField) return false;
      if (newValue && h.newValue !== newValue) return false;
      return true;
    });
    if (log) return log.createdAt;
  }
  
  // Fallbacks
  if (changedField === "STATUS" && newValue === "IN_REVIEW" && quote.isVisited) {
    return quote.createdAt;
  }
  return "";
};

const formatStepperDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} - ${hours}:${minutes}`;
};

const getBottomButtons = (quote: any) => {
  if (!quote) return [];

  const viability = quote.viabilityStatus;
  const customerResponse = quote.customerResponseStatus;
  const isExpired = viability === "EXPIRED";

  // Case 1: viabilityStatus is PENDING or EXPIRED
  if ((quote.isVisited && viability === "PENDING") || viability === "EXPIRED") {
    return [
      {
        label: "Inviable",
        variant: isExpired ? "grey" : "red",
        disabled: isExpired,
        action: "INVIABLE"
      },
      {
        label: "Viable",
        variant: isExpired ? "grey" : "green",
        disabled: isExpired,
        action: "VIABLE"
      }
    ];
  }

  // Determine what button set was active before/during finalization
  // Finalized states: CONFIRMED, REJECTED, UPDATED, EXPIRED
  const isFinalized = ["CONFIRMED", "REJECTED", "UPDATED", "EXPIRED"].includes(customerResponse) || quote.status === "CANCELLED";

  // Did it go through negotiation?
  const wasInNegotiation = customerResponse === "IN_NEGOTIATION" || 
    (quote.statusHistory && Array.isArray(quote.statusHistory) && quote.statusHistory.some((h: any) => h.newValue === "IN_NEGOTIATION"));

  if (isFinalized) {
    if (wasInNegotiation) {
      return [
        { label: "Rechazar", variant: "grey", disabled: true, action: "RECHAZAR" },
        { label: "Actualizar Información", variant: "grey", disabled: true, action: "ACTUALIZAR" },
        { label: "Negociación Externa", variant: "grey", disabled: true, action: "WHATSAPP" }
      ];
    } else if (viability === "VIABLE") {
      return [
        { label: "Rechazar", variant: "grey", disabled: true, action: "RECHAZAR" },
        { label: "Aceptar", variant: "grey", disabled: true, action: "ACEPTAR" }
      ];
    } else {
      return [
        { label: "Rechazar", variant: "grey", disabled: true, action: "RECHAZAR" },
        { label: "Negociación Externa", variant: "grey", disabled: true, action: "WHATSAPP" }
      ];
    }
  }

  // Active states
  if (customerResponse === "IN_NEGOTIATION") {
    return [
      { label: "Rechazar", variant: "red", disabled: false, action: "RECHAZAR" },
      { label: "Actualizar Información", variant: "white", disabled: false, action: "ACTUALIZAR" },
      { label: "Negociación Externa", variant: "white", disabled: false, action: "WHATSAPP" }
    ];
  }

  if (viability === "VIABLE" && customerResponse === "PENDING") {
    return [
      { label: "Rechazar", variant: "red", disabled: false, action: "RECHAZAR" },
      { label: "Aceptar", variant: "green", disabled: false, action: "ACEPTAR" }
    ];
  }

  if (viability === "NONVIABLE" && customerResponse === "PENDING") {
    return [
      { label: "Rechazar", variant: "red", disabled: false, action: "RECHAZAR" },
      { label: "Negociación Externa", variant: "white", disabled: false, action: "WHATSAPP" }
    ];
  }

  return [];
};

const getButtonClass = (variant: string) => {
  switch (variant) {
    case "red":
      return "bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm transition-colors";
    case "green":
      return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-sm transition-colors";
    case "white":
      return "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-medium shadow-sm transition-colors";
    case "grey":
    default:
      return "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none";
  }
};

const stepperSteps = [
  { label: "Visitado", icon: Eye },
  { label: "Validación del Diseño", icon: Scale },
  { label: "Estado de la Cotización", icon: ClipboardCheck },
  { label: "Confirmación de Cotización", icon: Handshake },
];

const VIEW_TO_PLACEMENT: Record<string, string> = {
  frontal: "FRONT",
  espalda: "BACK",
  brazo_izq: "LEFTSLEEVE",
  brazo_der: "RIGHTSLEEVE",
};

export default function DetalleCotizacion() {
  const router = useRouter();
  const pathParams = useParams();
  const id = pathParams?.id as string;
  
  const [activeModal, setActiveModal] = useState<"RECHAZAR" | "ACEPTAR" | "WHATSAPP" | "VIABLE" | "INVIABLE" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [unfeasibleReason, setUnfeasibleReason] = useState("");
  const [proposalPrice, setProposalPrice] = useState("");
  const [proposalFinalPrice, setProposalFinalPrice] = useState("");
  const [proposalEstimatedDays, setProposalEstimatedDays] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");

  const [activePreviewPlacement, setActivePreviewPlacement] = useState<string>("");

  const { data: quote, isLoading } = useQuery<any>({
    queryKey: ["quote-detail", id],
    queryFn: async () => {
      if (!id) return null;
      return apiGet(`/api/merchant/quotes/${id}`);
    },
    enabled: !!id 
  });

  const designPlacementsCount = useMemo(() => {
    const counts = { FRONT: 0, BACK: 0, RIGHTSLEEVE: 0, LEFTSLEEVE: 0 };
    if (!quote?.designs) return counts;
    quote.designs.forEach((d: any) => {
      const p = d.placement as keyof typeof counts;
      if (counts[p] !== undefined) {
        counts[p]++;
      }
    });
    return counts;
  }, [quote?.designs]);

  const designedPlacements = useMemo(() => {
    if (!quote?.designs) return [];
    return quote.designs;
  }, [quote?.designs]);

  useEffect(() => {
    if (designedPlacements.length > 0) {
      const exists = designedPlacements.some((d: any) => d.placement === activePreviewPlacement);
      if (!exists) {
        setActivePreviewPlacement(designedPlacements[0].placement);
      }
    } else {
      setActivePreviewPlacement("");
    }
  }, [designedPlacements, activePreviewPlacement]);

  const matchingPreviewDesign = useMemo(() => {
    return designedPlacements.find((d: any) => d.placement === activePreviewPlacement);
  }, [designedPlacements, activePreviewPlacement]);

  const respondQuote = useMutation({
    mutationFn: (data: { quotedPrice: number; finalPrice?: number; estimatedProductionTime?: number; merchantMessage?: string }) => 
      apiPatch(`/api/merchant/quotes/${id}/respond`, data),
    onSuccess: () => {
      toast.success("Propuesta enviada correctamente");
      setActiveModal(null);
      router.push("/gestion-cotizaciones");
    },
    onError: (err: any) => {
      toast.error("Error al enviar propuesta", { description: err.message });
    }
  });

  const markUnfeasible = useMutation({
    mutationFn: (data: { unfeasibleReason: string }) => 
      apiPatch(`/api/merchant/quotes/${id}/unfeasible`, data),
    onSuccess: () => {
      toast.success("Cotización marcada como inviable");
      setActiveModal(null);
      router.push("/gestion-cotizaciones");
    },
    onError: (err: any) => {
      toast.error("Error al rechazar cotización", { description: err.message });
    }
  });

  // Procesamiento dinámico para la Matriz de Cantidades
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
          hex: col.hexCode, // Mapped from database schema hexCode
        });
      }
    });
    return Array.from(colorsMap.values());
  }, [quote?.items]);

  const getQuantity = (colorId: string, sizeId: string) => {
    if (!quote?.items) return 0;
    const found = quote.items.find(
      (item: any) =>
        item.productVariant?.colorId === colorId &&
        item.productVariant?.sizeId === sizeId
    );
    return found ? found.quantity : 0;
  };

  const getColorTotal = (colorId: string) => {
    return uniqueSizes.reduce((acc: number, size: any) => acc + getQuantity(colorId, size.id), 0);
  };

  const getSizeTotal = (sizeId: string) => {
    return uniqueColors.reduce((acc: number, color: any) => acc + getQuantity(color.id, sizeId), 0);
  };

  const totalQuantity = useMemo(() => {
    if (!quote?.items) return 0;
    return quote.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
  }, [quote?.items]);

  // Controla qué vista se muestra en el cuadro grande
  const [selectedView, setSelectedView] = useState<"frontal" | "espalda" | "brazo_izq" | "brazo_der">("frontal");

  const matchingDesign = useMemo(() => {
    const currentPlacement = VIEW_TO_PLACEMENT[selectedView];
    return quote?.designs?.find((d: any) => d.placement === currentPlacement);
  }, [quote?.designs, selectedView]);

  // Lógica de cálculo de descuentos en tiempo real
  const discountDetails = useMemo(() => {
    if (!quote || !quote.availableDiscounts) {
      return { volumeDiscount: null, volumePct: 0, seasonDiscount: null, seasonPct: 0, totalDiscountPct: 0, combinedType: 'none', showVolume: false, showSeason: false };
    }

    const { discountRules = [], seasonDiscounts = [] } = quote.availableDiscounts;
    const qty = quote.totalQuantity || 0;

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
      return quote.items?.some((item: any) => {
        const catName = item.productVariant?.product?.category?.name;
        const catId = item.productVariant?.product?.categoryId;
        return sd.appliesTo.includes(catName) || sd.appliesTo.includes(catId);
      });
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
  }, [quote]);

  const handleBasePriceChange = (val: string) => {
    setProposalPrice(val);
    if (!val || isNaN(Number(val))) {
      setProposalFinalPrice("");
      return;
    }
    const base = Number(val);
    const pct = discountDetails.totalDiscountPct;
    const final = base * (1 - pct / 100);
    setProposalFinalPrice(final.toFixed(2));
  };

  const handleFinalPriceChange = (val: string) => {
    setProposalFinalPrice(val);
    if (!val || isNaN(Number(val))) {
      setProposalPrice("");
      return;
    }
    const final = Number(val);
    const pct = discountDetails.totalDiscountPct;
    if (pct >= 100) {
      setProposalPrice("0.00");
    } else {
      const base = final / (1 - pct / 100);
      setProposalPrice(base.toFixed(2));
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 flex h-64 items-center justify-center">Cargando detalles...</div>;
  if (!quote) return <div className="p-8 text-center text-red-500 flex flex-col h-64 items-center justify-center gap-2">
    <p className="font-bold text-lg">Cotización no encontrada.</p>
    <Link href="/gestion-cotizaciones" className="mt-4 text-blue-500 underline">Volver a la bandeja</Link>
  </div>;

  const firstItem = quote.items?.[0];
  const dbProduct = firstItem?.productVariant?.product;
  const dbProductImages = dbProduct?.images || [];

  // Las 4 imágenes dinámicas (o fallbacks locales si no están disponibles)
  const mockViews = {
    frontal: dbProductImages[0]?.url || "/prenda-base.png", 
    espalda: dbProductImages[1]?.url || "/prenda-base2.png", 
    brazo_izq: dbProductImages[2]?.url || "/prenda-base3.jpg",
    brazo_der: dbProductImages[3]?.url || "/prenda-base4.jpg"
  };

  const garmentType = dbProduct?.name || quote.garmentType || "Polo Cuello Camisero";
  const fabricType = dbProduct?.fabric?.value || quote.fabricType || "Piqué";

  const dbProductPrimaryImage = dbProductImages.find((img: any) => img.isPrimary)?.url || dbProductImages[0]?.url;

  const baseProduct = {
    id: dbProduct?.id || "polo-camisero-id",
    name: garmentType,
    basePrice: dbProduct?.basePrice ? Number(dbProduct.basePrice) : (quote.estimatedPrice || quote.quotedPrice ? Number(quote.estimatedPrice || quote.quotedPrice) * 0.7 : 35.00),
    category: dbProduct?.category?.name || "Prendas",
    fabric: fabricType || "Textil",
    image: dbProductPrimaryImage || "/prenda-base.png"
  };

  const clientName = quote.client 
    ? (quote.client.name || `${quote.client.firstName || ""} ${quote.client.lastName || ""}`.trim())
    : "Cliente General";
  const initials = clientName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const rawPhone = quote.client?.whatsappNumber || "999999999";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/51${cleanPhone}?text=${encodeURIComponent(`Hola ${clientName}, me contacto por la cotización #${id?.slice(0, 6).toUpperCase()} en CoreMen.`)}`;
  const quotedPrice = quote.customerPrice || quote.estimatedPrice || quote.quotedPrice || 0;

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    toast.success("Cotización rechazada (Acción simulada)");
    setActiveModal(null);
  };

  const handleAcceptSubmit = () => {
    if (!proposalPrice || isNaN(Number(proposalPrice)) || Number(proposalPrice) < 0) {
      toast.error("Por favor ingresa un precio válido");
      return;
    }
    const days = parseInt(proposalEstimatedDays, 10);
    if (isNaN(days) || days <= 0) {
      toast.error("Por favor ingresa una cantidad de días de producción válida (número entero positivo)");
      return;
    }
    respondQuote.mutate({
      quotedPrice: Number(proposalPrice),
      finalPrice: Number(proposalFinalPrice) || undefined,
      estimatedProductionTime: days,
      merchantMessage: proposalMessage || undefined,
    });
  };

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
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tiempo de Producción</p>
              <p className="text-base font-bold text-slate-800">
                {quote?.estimatedProductionTime ? `${quote.estimatedProductionTime} días hábiles` : "No definido"}
              </p>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-start w-full max-w-4xl mx-auto py-2">
              {stepperSteps.map((step, idx) => {
                const {
                  state,
                  statusText,
                  statusTextColor,
                  historyDate
                } = getStepDetails(idx, quote);
                const StepIcon = step.icon;

                // Conector izquierdo (de idx-1 a idx)
                // Color determinado por el estado del paso actual (idx)
                const leftLineColor = getLineColorClass(state);

                // Conector derecho (de idx a idx+1)
                // Color determinado por el estado del siguiente paso (idx+1)
                const nextStepState = idx < stepperSteps.length - 1 ? getStepState(idx + 1, quote) : "pending";
                const rightLineColor = getLineColorClass(nextStepState);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center relative">
                    {/* Conector izquierdo */}
                    {idx > 0 && (
                      <div 
                        className={`absolute left-0 right-1/2 top-6 h-[4px] -translate-y-1/2 z-0 transition-all duration-500 ${leftLineColor}`}
                      />
                    )}
                    {/* Conector derecho */}
                    {idx < stepperSteps.length - 1 && (
                      <div 
                        className={`absolute left-1/2 right-0 top-6 h-[4px] -translate-y-1/2 z-0 transition-all duration-500 ${rightLineColor}`}
                      />
                    )}

                    {/* Círculo del paso */}
                    {state === "completed" ? (
                      <div className="relative z-10 flex items-center justify-center w-12 h-12">
                        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : state === "cancelled" ? (
                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-red-100/70 border border-red-200/50 shadow-sm">
                        <div className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md">
                          <X className="w-5 h-5 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : state === "current" ? (
                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-amber-100/70 border border-amber-200/50 shadow-sm">
                        <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md animate-pulse-subtle">
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
                    <div className="text-center mt-3 px-1 flex flex-col items-center">
                      <p className={`text-sm font-bold leading-tight ${state === "pending" ? "text-slate-400" : "text-slate-800"}`}>
                        {step.label}
                      </p>
                      <p className={`text-[11px] mt-1 whitespace-nowrap ${statusTextColor}`}>
                        {statusText}
                      </p>
                      {historyDate && (
                        <p className="text-[10px] mt-0.5 text-slate-500 font-mono">
                          {formatStepperDate(historyDate)}
                        </p>
                      )}
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
                  {matchingDesign ? (
                    <div className="scale-[0.75] origin-center flex items-center justify-center shrink-0">
                      <CustomizerDinamico
                        baseGarmentUrl={matchingDesign.baseGarmentUrl}
                        logoUrl={matchingDesign.logoUrl}
                        positionX={matchingDesign.positionX}
                        positionY={matchingDesign.positionY}
                        width={matchingDesign.width}
                        height={matchingDesign.height}
                        rotation={matchingDesign.rotation}
                        canvasWidth={matchingDesign.canvasWidth}
                        canvasHeight={matchingDesign.canvasHeight}
                        readOnly={true}
                        isSimulationActive={true}
                      />
                    </div>
                  ) : (
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
                  )}
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
                        {uniqueSizes.map((size: any) => (
                          <th key={size.id} className="py-3 px-2 text-center">{size.abbreviation || size.name}</th>
                        ))}
                        {uniqueSizes.length > 1 && (
                          <th className="py-3 px-2 text-center font-bold text-slate-700">Total</th>
                        )}
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
                            <td key={size.id} className="py-3 px-2 text-center text-slate-600">
                              {getQuantity(color.id, size.id)}
                            </td>
                          ))}
                          {uniqueSizes.length > 1 && (
                            <td className="py-3 px-2 text-center font-bold text-slate-900">
                              {getColorTotal(color.id)}
                            </td>
                          )}
                        </tr>
                      ))}
                      {uniqueColors.length > 1 && (
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                          <td className="py-3 px-2 text-slate-700 text-xs uppercase whitespace-nowrap">Totales por Talla</td>
                          {uniqueSizes.map((size: any) => (
                            <td key={size.id} className="py-3 px-2 text-center text-blue-700">
                              {getSizeTotal(size.id)}
                            </td>
                          ))}
                          {uniqueSizes.length > 1 && (
                            <td className="py-3 px-2 text-center text-orange-600 text-lg">
                              {totalQuantity}
                            </td>
                          )}
                        </tr>
                      )}
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
                        S/ {quotedPrice ? Number(quotedPrice).toFixed(2) : "0.00"}
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
            
            <div className="p-6 flex flex-col gap-8">
              {/* FILA 1: Dos columnas (Vista Previa Prenda vs Logotipo Utilizado) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna 1: Vista Previa de la prenda con logo */}
                <div className="bg-white rounded-xl p-5 flex flex-col border border-slate-800 bg-slate-950/20">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-blue-600" /> Vista Previa de Diseño (Con relieve y posición)
                  </h3>
                  <div 
                    className="w-full bg-white rounded-lg border border-slate-200 flex items-center justify-center relative overflow-hidden"
                    style={{ height: '350px' }}
                  >
                    {matchingPreviewDesign ? (
                      <div className="scale-[0.68] origin-center flex items-center justify-center shrink-0" key={activePreviewPlacement}>
                        <CustomizerDinamico
                          baseGarmentUrl={matchingPreviewDesign.baseGarmentUrl}
                          logoUrl={matchingPreviewDesign.logoUrl}
                          positionX={matchingPreviewDesign.positionX}
                          positionY={matchingPreviewDesign.positionY}
                          width={matchingPreviewDesign.width}
                          height={matchingPreviewDesign.height}
                          rotation={matchingPreviewDesign.rotation}
                          canvasWidth={matchingPreviewDesign.canvasWidth}
                          canvasHeight={matchingPreviewDesign.canvasHeight}
                          readOnly={true}
                          isSimulationActive={true}
                          showEmbroideryArea={true}
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">No hay vista previa disponible</span>
                    )}
                  </div>
                  {/* Miniaturas: SOLO aparecen las vistas que están relacionadas con un diseño */}
                  {designedPlacements.length > 1 && (
                    <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
                      {designedPlacements.map((d: any) => {
                        const isSelected = activePreviewPlacement === d.placement;
                        return (
                          <div 
                            key={d.id}
                            onClick={() => setActivePreviewPlacement(d.placement)}
                            className={`h-14 w-14 bg-white rounded-lg border-2 cursor-pointer shrink-0 overflow-hidden relative transition-all flex items-center justify-center p-0.5 ${
                              isSelected 
                                ? 'border-blue-500 shadow-md scale-[1.03]' 
                                : 'border-slate-200 hover:border-blue-300'
                            }`}
                            title={translatePlacement(d.placement)}
                          >
                            <img 
                              src={d.baseGarmentUrl || "/prenda-base.png"} 
                              alt={d.placement} 
                              className="max-w-full max-h-full object-contain rounded"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Columna 2: Logotipo utilizado únicamente */}
                <div className="bg-white rounded-xl p-5 flex flex-col border border-slate-800 bg-slate-950/20">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <ImageIcon className="h-4 w-4 text-blue-600" /> Logotipo Solicitado por el Cliente
                  </h3>
                  <div 
                    className="w-full bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center relative overflow-hidden p-4"
                    style={{ height: '350px' }}
                  >
                    {matchingPreviewDesign?.logoUrl ? (
                      <img 
                        src={matchingPreviewDesign.logoUrl} 
                        alt="Logotipo del cliente" 
                        className="max-w-full max-h-full object-contain shadow-sm border border-slate-200/50 bg-white p-2 rounded"
                      />
                    ) : (
                      <span className="text-slate-400 text-sm">No hay logotipo disponible</span>
                    )}
                  </div>
                  {/* Descarga y metadatos */}
                  {matchingPreviewDesign?.logoUrl && (
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Ubicación: <strong className="text-slate-800">{translatePlacement(matchingPreviewDesign.placement)}</strong></span>
                      <a 
                        href={matchingPreviewDesign.logoUrl} 
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" /> Descargar Logo original
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* FILA 2: Especificaciones Técnicas (Abajo, ancho completo) */}
              <div className="bg-white rounded-xl p-5 flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <FileText className="h-4 w-4 text-blue-600" /> Especificaciones Técnicas
                </h3>
                
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 font-semibold bg-slate-50 border-b border-slate-100 uppercase">
                      <tr>
                        <th className="py-2 px-2 whitespace-nowrap">Ubicación</th>
                        <th className="py-2 px-2 whitespace-nowrap">Método / Técnica</th>
                        <th className="py-2 px-2 whitespace-nowrap">Especificaciones de Medidas</th>
                        <th className="py-2 px-2 whitespace-nowrap">Rotación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {designedPlacements.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                            No hay especificaciones de personalización registradas.
                          </td>
                        </tr>
                      ) : (
                        designedPlacements.map((design: any) => (
                          <tr key={design.id}>
                            <td className="py-3 px-2 font-medium text-slate-800 whitespace-nowrap">
                              {translatePlacement(design.placement)}
                            </td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getTechniqueBadgeClass(design.technique?.name)}`}>
                                {design.technique?.name || "Sin especificar"}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                              {Math.round(design.width)}px x {Math.round(design.height)}px
                            </td>
                            <td className="py-3 px-2 text-slate-600 whitespace-nowrap">
                              {design.rotation ? Math.round(design.rotation) : 0}°
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {matchingPreviewDesign?.logoUrl && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded flex items-center justify-center p-1.5 shadow-sm shrink-0 overflow-hidden">
                        <img 
                          src={matchingPreviewDesign.logoUrl} 
                          alt="Miniatura Logo" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Archivo de Diseño ({translatePlacement(matchingPreviewDesign.placement)})</p>
                        <p className="text-[10px] text-slate-500">Logotipo utilizado por el cliente</p>
                      </div>
                    </div>
                    <a 
                      href={matchingPreviewDesign.logoUrl} 
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar Arte
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTONERA INFERIOR: Contenedor sticky transparente de ancho completo para garantizar el seguimiento */}
      <div className="sticky bottom-0 w-full z-40 bg-transparent mt-auto">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.08),_0_-10px_15px_-3px_rgba(0,0,0,0.03)] mx-6 mb-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 justify-center items-center">
            {getBottomButtons(quote).map((btn, idx) => (
              <button
                key={idx}
                disabled={btn.disabled}
                onClick={() => {
                  if (btn.action === "RECHAZAR") {
                    setActiveModal("RECHAZAR");
                  } else if (btn.action === "INVIABLE") {
                    setActiveModal("INVIABLE");
                  } else if (btn.action === "VIABLE") {
                    setActiveModal("VIABLE");
                  } else if (btn.action === "ACEPTAR") {
                    const basePrice = quote.customerPrice || quote.estimatedPrice || quote.quotedPrice || 0;
                    setProposalPrice(basePrice ? String(basePrice) : "");
                    if (basePrice) {
                      const pct = discountDetails.totalDiscountPct;
                      const final = Number(basePrice) * (1 - pct / 100);
                      setProposalFinalPrice(final.toFixed(2));
                    } else {
                      setProposalFinalPrice("");
                    }
                    setProposalEstimatedDays(quote.estimatedProductionTime ? String(quote.estimatedProductionTime) : "");
                    setProposalMessage(quote.merchantMessage || "");
                    setActiveModal("ACEPTAR");
                  } else if (btn.action === "WHATSAPP") {
                    setActiveModal("WHATSAPP");
                  } else if (btn.action === "ACTUALIZAR") {
                    router.push(`/gestion-cotizaciones/${id}/actualizar-cotizacion`);
                  }
                }}
                className={`w-full sm:flex-1 h-12 text-base font-semibold rounded-xl flex items-center justify-center border ${getButtonClass(btn.variant)}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* MODALES */}
      {/* MODALES */}
      
      {/* Modal 1: VIABLE */}
      <Dialog open={activeModal === "VIABLE"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2">
              <CheckCircle className="w-5.5 h-5.5" /> Confirmar Viabilidad
            </DialogTitle>
            <DialogDescription>
              Aceptarás el diseño de esta cotización como viable.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600">
            ¿Estás seguro de que deseas marcar este diseño como viable? Al confirmar, aceptarás la propuesta de diseño técnico.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActiveModal(null)} className="border-slate-300">
              Cancelar
            </Button>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold" 
              onClick={() => {
                toast.success("Diseño marcado como viable (Simulado)");
                setActiveModal(null);
              }}
            >
              Confirmar Viabilidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: INVIABLE */}
      <Dialog open={activeModal === "INVIABLE"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-5.5 h-5.5" /> Declarar Diseño Inviable
            </DialogTitle>
            <DialogDescription>
              Indica el motivo técnico por el cual declaras el diseño como inviable.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-slate-600">
              Al confirmar, se registrará el diseño como inviable y se le notificará al cliente para que realice ajustes.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Motivo de Inviabilidad *</label>
              <Textarea 
                placeholder="Ej. El diseño excede el tamaño máximo permitido para la manga..." 
                value={unfeasibleReason} 
                onChange={(e) => setUnfeasibleReason(e.target.value)} 
                rows={4} 
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActiveModal(null)} className="border-slate-300">
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              disabled={!unfeasibleReason.trim()} 
              onClick={() => {
                toast.success("Diseño marcado como inviable (Simulado)");
                setActiveModal(null);
              }}
            >
              Confirmar Inviabilidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: RECHAZAR */}
      <Dialog open={activeModal === "RECHAZAR"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="w-5.5 h-5.5" /> Rechazar Cotización
            </DialogTitle>
            <DialogDescription>
              Estás por rechazar de forma definitiva esta cotización.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-slate-600">
              Esta acción cancelará el flujo de negociación. Por favor indica el motivo del rechazo.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Motivo de Rechazo *</label>
              <Textarea 
                placeholder="Indica el motivo por el cual rechazas esta cotización..." 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                rows={4} 
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActiveModal(null)} className="border-slate-300">
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              disabled={!rejectReason.trim()} 
              onClick={handleRejectSubmit}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: ACEPTAR */}
      <Dialog open={activeModal === "ACEPTAR"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="w-5.5 h-5.5" /> Aceptar Cotización
            </DialogTitle>
            <DialogDescription>
              Aprobarás esta cotización e indicarás la propuesta final para este lote.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {/* Resumen */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-500">
                <span>Valor estimado original:</span>
                <span className="font-bold text-slate-800">S/ {quotedPrice ? Number(quotedPrice).toFixed(2) : "0.00"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Cantidad total de prendas:</span>
                <span className="font-bold text-slate-800">{totalQuantity} unidades</span>
              </div>
              <div className="border-t border-slate-100 pt-2 text-slate-500 space-y-1.5">
                <span className="block font-medium mb-1">Ubicaciones de Personalización:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${designPlacementsCount.FRONT > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    Frontal ({designPlacementsCount.FRONT})
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${designPlacementsCount.BACK > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    Espalda ({designPlacementsCount.BACK})
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${designPlacementsCount.RIGHTSLEEVE > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    Manga Der. ({designPlacementsCount.RIGHTSLEEVE})
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${designPlacementsCount.LEFTSLEEVE > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                    Manga Izq. ({designPlacementsCount.LEFTSLEEVE})
                  </span>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Valor Preciso de Cotización (S/) *</label>
                <Input 
                  type="number" 
                  placeholder="Ej. 1250" 
                  value={proposalPrice} 
                  onChange={(e) => handleBasePriceChange(e.target.value)} 
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Precio base propuesto antes de descuentos a nivel cliente.</span>
              </div>

              {/* Descuentos Aplicados */}
              {(discountDetails.showVolume || discountDetails.showSeason) && (
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 text-xs space-y-1.5">
                  <span className="font-bold text-amber-800 block mb-0.5">Descuentos Aplicados automáticamente:</span>
                  
                  {discountDetails.showVolume && (
                    <div className="flex justify-between items-center text-amber-700">
                      <span>• Descuento por cantidad (mayor a {discountDetails.volumeDiscount.minQuantity} uds):</span>
                      <span className="font-bold">-{discountDetails.volumePct}%</span>
                    </div>
                  )}
                  
                  {discountDetails.showSeason && (
                    <div className="flex justify-between items-center text-amber-700">
                      <span>• Descuento por temporada ({discountDetails.seasonDiscount.name}):</span>
                      <span className="font-bold">-{discountDetails.seasonPct}%</span>
                    </div>
                  )}

                  <div className="border-t border-amber-200/50 pt-1.5 flex justify-between items-center text-amber-800 font-bold">
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
                <label className="text-xs font-semibold text-slate-500">Valor final a pagar por el Cliente (S/) *</label>
                <Input 
                  type="number" 
                  placeholder="Ej. 1200" 
                  value={proposalFinalPrice} 
                  onChange={(e) => handleFinalPriceChange(e.target.value)} 
                  className="bg-green-50/20 border-green-200 focus:border-green-500 text-green-700 font-bold"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Precio final calculado aplicando los descuentos.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Tiempo Estimado de Producción (Días Hábiles) *</label>
                <Input 
                  type="number"
                  placeholder="Ej. 5" 
                  value={proposalEstimatedDays} 
                  onChange={(e) => setProposalEstimatedDays(e.target.value)} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Mensaje Comercial *</label>
                <Textarea 
                  placeholder="Ej. El precio propuesto incluye el descuento por volumen coordinado..." 
                  value={proposalMessage} 
                  onChange={(e) => setProposalMessage(e.target.value)} 
                  rows={3} 
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActiveModal(null)} className="border-slate-300">
              Cancelar
            </Button>
            <Button 
              className="bg-[#10B981] hover:bg-[#059669] text-white" 
              onClick={handleAcceptSubmit}
              disabled={!proposalPrice || !proposalEstimatedDays.trim() || !proposalMessage.trim() || isNaN(Number(proposalPrice)) || isNaN(Number(proposalEstimatedDays))}
            >
              Confirmar y Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: WHATSAPP */}
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

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setActiveModal(null)}
              className="border-slate-300"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}