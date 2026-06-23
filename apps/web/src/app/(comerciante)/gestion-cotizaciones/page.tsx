"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  FileText, 
  Clock, 
  Banknote, 
  Filter, 
  Eye, 
  Shirt,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Brush
} from "lucide-react";

export default function CotizacionesComerciante() {
  // 1. Estados para los Filtros
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [garmentFilter, setGarmentFilter] = useState("Todos");
  const [clientSearchFilter, setClientSearchFilter] = useState("");
  
  // 2. Estados para la Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // 3. Consulta de Cotizaciones (Base de datos)
  const { data: quotes = [], isLoading } = useQuery<any>({ 
    queryKey: ["merchant-quotes"], 
    queryFn: () => apiGet("/api/merchant/quotes") 
  });

  // Regla de Negocio: Cotizaciones en negociación (PENDING, IN_REVIEW, CANCELLED sin formalizar)
  // Ordenado por estado (Nuevo/PENDING -> En Revisión/IN_REVIEW -> Cancelado/CANCELLED)
  // Y luego por fecha decreciente (más reciente primero)
  const negociacionesQuotes = useMemo(() => {
    const statusOrder: Record<string, number> = {
      PENDING: 1,
      IN_REVIEW: 2,
      CANCELLED: 3,
    };

    return quotes
      .filter((q: any) => {
        const isPending = q.status === "PENDING";
        const isInReview = q.status === "IN_REVIEW";
        const isCancelledNegotiation = q.status === "CANCELLED" && q.clientFormalizationStatus !== "CONFIRMED";
        return isPending || isInReview || isCancelledNegotiation;
      })
      .sort((a: any, b: any) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
  }, [quotes]);

  // 4. Extracción dinámica de Tipos de Prenda únicos de la BD para el menú desplegable
  const uniqueGarmentTypes = useMemo(() => {
    if (!negociacionesQuotes || negociacionesQuotes.length === 0) return [];
    const typesSet = new Set<string>();
    negociacionesQuotes.forEach((q: any) => {
      if (q.items) {
        q.items.forEach((item: any) => {
          const catName = item.productVariant?.product?.category?.name;
          if (catName) typesSet.add(catName);
        });
      }
    });
    return Array.from(typesSet) as string[];
  }, [negociacionesQuotes]);

  // 5. Cálculos fijos para los KPIs superiores (Datos globales históricos)
  const pendingCount = negociacionesQuotes.filter((q: any) => q.status === "PENDING").length;
  const quotedCount = negociacionesQuotes.filter((q: any) => q.status === "IN_REVIEW").length;
  
  // Cotizaciones activas (excluyendo canceladas)
  const activeNegociaciones = useMemo(() => {
    return negociacionesQuotes.filter((q: any) => q.status === "PENDING" || q.status === "IN_REVIEW");
  }, [negociacionesQuotes]);

  // Mayor Valor de Cotización (Card 3)
  const maxQuoteValue = useMemo(() => {
    if (activeNegociaciones.length === 0) return 0;
    return Math.max(...activeNegociaciones.map((q: any) => Number(q.customerPrice || q.estimatedPrice) || 0));
  }, [activeNegociaciones]);

  // ID de la Cotización con Mayor Valor (para Card 3 clickeable)
  const maxQuoteId = useMemo(() => {
    if (activeNegociaciones.length === 0) return null;
    let maxQuote = activeNegociaciones[0];
    let maxVal = Number(maxQuote.customerPrice || maxQuote.estimatedPrice) || 0;
    
    for (let i = 1; i < activeNegociaciones.length; i++) {
      const val = Number(activeNegociaciones[i].customerPrice || activeNegociaciones[i].estimatedPrice) || 0;
      if (val > maxVal) {
        maxVal = val;
        maxQuote = activeNegociaciones[i];
      }
    }
    return maxQuote.id;
  }, [activeNegociaciones]);

  // Suma de Valores de Cotización (Card 4)
  const sumQuoteValue = useMemo(() => {
    return activeNegociaciones.reduce((acc: number, q: any) => acc + (Number(q.customerPrice || q.estimatedPrice) || 0), 0);
  }, [activeNegociaciones]);

  // 6. Lógica de Filtrado en Tiempo Real (Frontend)
  const filteredQuotes = useMemo(() => {
    return negociacionesQuotes.filter((quote: any) => {
      // Filtro de Estado
      let matchesStatus = true;
      if (statusFilter === "PENDING") matchesStatus = quote.status === "PENDING";
      if (statusFilter === "IN_REVIEW") matchesStatus = quote.status === "IN_REVIEW";
      if (statusFilter === "CANCELLED") matchesStatus = quote.status === "CANCELLED";

      // Filtro de Tipo de Prenda
      const garmentNames = quote.items?.map((item: any) => item.productVariant?.product?.category?.name) || [];
      const matchesGarment = garmentFilter === "Todos" || garmentNames.includes(garmentFilter);

      // Filtro de Rango de Fecha (Inicio y Fin del día)
      let matchesDateRange = true;
      if (startDateFilter || endDateFilter) {
        const quoteDate = new Date(quote.createdAt);
        quoteDate.setHours(0, 0, 0, 0);

        if (startDateFilter) {
          const start = new Date(startDateFilter + "T00:00:00");
          if (quoteDate < start) matchesDateRange = false;
        }
        if (endDateFilter) {
          const end = new Date(endDateFilter + "T00:00:00");
          if (quoteDate > end) matchesDateRange = false;
        }
      }

      // Filtro de Cliente (Nombre Completo o Razón Social)
      let matchesClient = true;
      if (clientSearchFilter.trim()) {
        const searchVal = clientSearchFilter.toLowerCase();
        const client = quote.client;
        const fullName = `${client?.firstName || ""} ${client?.lastName || ""} ${client?.maternalLastName || ""}`.toLowerCase();
        const businessName = (client?.businessName || "").toLowerCase();
        matchesClient = fullName.includes(searchVal) || businessName.includes(searchVal);
      }

      return matchesStatus && matchesGarment && matchesDateRange && matchesClient;
    });
  }, [negociacionesQuotes, statusFilter, garmentFilter, startDateFilter, endDateFilter, clientSearchFilter]);

  // 7. Lógica de Paginación Dinámica (Máximo 8 por página)
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage) || 1;
  
  const paginatedQuotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredQuotes.slice(startIndex, endIndex);
  }, [filteredQuotes, currentPage, itemsPerPage]);

  // Función para resetear todos los filtros de golpe
  const handleClearFilters = () => {
    setStatusFilter("Todos");
    setStartDateFilter("");
    setEndDateFilter("");
    setGarmentFilter("Todos");
    setClientSearchFilter("");
    setCurrentPage(1);
  };

  const formatDateString = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return new Date(dateString).toLocaleString('es-ES', options).replace('.', ',');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            Nuevo
          </div>
        );
      case "IN_REVIEW":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            En Revisión
          </div>
        );
      case "CANCELLED":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            Cancelado
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
            {status}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      
      {/* Header & Breadcrumb */}
      <div className="mb-8">
        <p className="text-sm text-slate-500 mb-1">Gestión Comercial / <span className="font-semibold text-slate-900">Negociaciones</span></p>
        <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Bandeja de Negociaciones</h1>
        <p className="text-slate-500 text-sm">Gestiona las propuestas activas y el proceso de formalización con los clientes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">Nuevo</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-blue-600">{pendingCount}</h3>
            <TrendingUp className="h-6 w-6 text-blue-300" strokeWidth={2.5} />
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">En Revisión</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-amber-600">{quotedCount}</h3>
            <FileText className="h-6 w-6 text-amber-300" strokeWidth={2.5} />
          </div>
        </div>

        {maxQuoteId ? (
          <Link 
            href={`/gestion-cotizaciones/${maxQuoteId}`}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <p className="text-sm text-slate-500 font-medium group-hover:text-blue-600 transition-colors">Mayor Cotización</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-[#0F172A]">S/ {maxQuoteValue.toLocaleString('es-PE')}</h3>
              <TrendingUp className="h-6 w-6 text-slate-300 group-hover:text-blue-600 transition-colors" strokeWidth={2.5} />
            </div>
          </Link>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <p className="text-sm text-slate-500 font-medium">Mayor Cotización</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-[#0F172A]">S/ 0.00</h3>
              <TrendingUp className="h-6 w-6 text-slate-300" strokeWidth={2.5} />
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">Valor en Negociación</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-emerald-500">S/ {sumQuoteValue.toLocaleString('es-PE')}</h3>
            <Banknote className="h-6 w-6 text-emerald-300" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        <div className="sm:col-span-12 md:col-span-3">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Cliente</label>
          <Input 
            type="text" 
            placeholder="Buscar cliente..."
            className="text-sm h-[42px]" 
            value={clientSearchFilter}
            onChange={(e) => { setClientSearchFilter(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="sm:col-span-6 md:col-span-2">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Estado</label>
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 h-[42px] outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="PENDING">Nuevo</option>
              <option value="IN_REVIEW">En Revisión</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="sm:col-span-6 md:col-span-2">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Prenda</label>
          <div className="relative">
            <select 
              value={garmentFilter}
              onChange={(e) => { setGarmentFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 h-[42px] outline-none"
            >
              <option key="Todos" value="Todos">Todos</option>
              {uniqueGarmentTypes.map((type: string) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="sm:col-span-6 md:col-span-2">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Desde</label>
          <Input 
            type="date" 
            className="text-sm h-[42px]" 
            value={startDateFilter}
            onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="sm:col-span-6 md:col-span-2">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Hasta</label>
          <Input 
            type="date" 
            className="text-sm h-[42px]" 
            value={endDateFilter}
            onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="sm:col-span-12 md:col-span-1">
          <Button 
            variant="outline" 
            onClick={handleClearFilters}
            className="w-full flex items-center justify-center h-[42px] bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
            title="Limpiar filtros"
          >
            <Brush className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">CLIENTE</th>
                <th className="px-6 py-4 font-semibold">FECHA Y HORA</th>
                <th className="px-6 py-4 font-semibold">PRENDA</th>
                <th className="px-6 py-4 font-semibold">ESTADO</th>
                <th className="px-6 py-4 font-semibold">VALOR DE COTIZACIÓN</th>
                <th className="px-6 py-4 font-semibold text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">Cargando negociaciones...</td></tr>
              ) : paginatedQuotes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">No se encontraron negociaciones que coincidan con los filtros.</td></tr>
              ) : (
                paginatedQuotes.map((quote: any) => {
                  const clientFullName = quote.client 
                    ? `${quote.client.firstName} ${quote.client.lastName} ${quote.client.maternalLastName || ""}`.trim() 
                    : "Cliente General";
                  const clientInitial = clientFullName.charAt(0).toUpperCase() || "C";
                  
                  const garmentText = quote.items && quote.items.length > 0 
                    ? Array.from(new Set(quote.items.map((item: any) => item.productVariant?.product?.category?.name))).filter(Boolean).join(", ")
                    : "Prenda";
                  const fabricText = quote.items && quote.items.length > 0
                    ? Array.from(new Set(quote.items.map((item: any) => item.productVariant?.product?.fabric?.value))).filter(Boolean).join(", ")
                    : "Tela";

                  return (
                    <tr key={quote.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        #NG-{quote.id.slice(0, 6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {clientInitial}
                          </div>
                          <span className="font-medium text-slate-900 line-clamp-1">{clientFullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {formatDateString(quote.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                          <Shirt className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-700 line-clamp-1 max-w-[120px]" title={`${garmentText} ${fabricText}`}>
                            {garmentText}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {quote.customerPrice ? (
                          <span className="font-semibold text-slate-900">S/ {Number(quote.customerPrice).toFixed(2)}</span>
                        ) : quote.estimatedPrice ? (
                          <span className="text-slate-500 italic" title="Precio estimado por el software">S/ {Number(quote.estimatedPrice).toFixed(2)} (Est.)</span>
                        ) : (
                          "Por definir"
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {/* Enlace dinámico con el icono del Ojo */}
                        <Link 
                          href={`/gestion-cotizaciones/${quote.id}`}
                          className="inline-flex p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Ver detalles de la negociación"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer - Completamente Dinámico */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div>
            Mostrando <span className="font-semibold text-slate-900">
              {filteredQuotes.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredQuotes.length)}
            </span> de <span className="font-semibold text-slate-900">{filteredQuotes.length}</span> negociaciones
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                className={`px-3 py-1 rounded font-medium text-xs transition-colors ${
                  currentPage === pageNumber
                    ? "bg-[#A0522D] text-white"
                    : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>Filas por página:</span>
            <div className="relative">
              <select 
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm rounded focus:outline-none py-1 pl-2 pr-6 outline-none"
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}