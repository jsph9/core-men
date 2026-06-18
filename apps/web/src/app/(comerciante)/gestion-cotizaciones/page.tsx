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
  ChevronDown
} from "lucide-react";

export default function CotizacionesComerciante() {
  // 1. Estados para los Filtros
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [dateFilter, setDateFilter] = useState("");
  const [garmentFilter, setGarmentFilter] = useState("Todos");
  
  // 2. Estados para la Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // 3. Consulta de Cotizaciones (Base de datos)
  const { data: quotes = [], isLoading } = useQuery<any>({ 
    queryKey: ["merchant-quotes"], 
    queryFn: () => apiGet("/api/merchant/quotes") 
  });

  // 4. Extracción dinámica de Tipos de Prenda únicos de la BD para el menú desplegable
  const uniqueGarmentTypes = useMemo(() => {
    if (!quotes || quotes.length === 0) return [];
    const types = quotes.map((q: any) => q.garmentType);
    return Array.from(new Set(types)) as string[];
  }, [quotes]);

  // 5. Cálculos fijos para los KPIs superiores (Datos globales históricos)
  const pendingCount = quotes.filter((q: any) => q.status === "PENDING").length;
  const quotedCount = quotes.filter((q: any) => q.status === "QUOTED").length;
  const totalValue = quotes.reduce((acc: number, q: any) => acc + (Number(q.quotedPrice) || 0), 0);

  // 6. Lógica de Filtrado en Tiempo Real (Frontend)
  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote: any) => {
      // Filtro de Estado
      let matchesStatus = true;
      if (statusFilter === "PENDING") matchesStatus = quote.status === "PENDING";
      if (statusFilter === "QUOTED") matchesStatus = quote.status === "QUOTED";
      if (statusFilter === "APPROVED") matchesStatus = quote.status === "APPROVED";

      // Filtro de Tipo de Prenda
      const matchesGarment = garmentFilter === "Todos" || quote.garmentType === garmentFilter;

      // Filtro de Fecha (Año-Mes)
      let matchesDate = true;
      if (dateFilter) {
        const quoteDate = new Date(quote.createdAt);
        const [year, month] = dateFilter.split("-");
        matchesDate = quoteDate.getFullYear() === parseInt(year) && (quoteDate.getMonth() + 1) === parseInt(month);
      }

      return matchesStatus && matchesGarment && matchesDate;
    });
  }, [quotes, statusFilter, garmentFilter, dateFilter]);

  // 7. Lógica de Paginación Dinámica (Máximo 8 por página)
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage) || 1;
  
  const paginatedQuotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredQuotes.slice(startIndex, endIndex);
  }, [filteredQuotes, currentPage]);

  // Función para resetear todos los filtros de golpe
  const handleClearFilters = () => {
    setStatusFilter("Todos");
    setDateFilter("");
    setGarmentFilter("Todos");
    setCurrentPage(1);
  };

  const formatDateString = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options).replace('.', ',');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
            En negociación
          </div>
        );
      case "QUOTED":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            Pendiente de formalización
          </div>
        );
      case "APPROVED":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            Aprobado
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
          <p className="text-sm text-slate-500 font-medium">En Negociación</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-orange-600">{pendingCount}</h3>
            <TrendingUp className="h-6 w-6 text-orange-300" strokeWidth={2.5} />
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">Pendientes Formalizar</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-blue-500">{quotedCount}</h3>
            <FileText className="h-6 w-6 text-blue-300" strokeWidth={2.5} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">Tiempo Promedio</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-[#0F172A]">2.4 Días</h3>
            <Clock className="h-6 w-6 text-slate-300" strokeWidth={2.5} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">Valor en Negociación</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-emerald-500">S/ {totalValue.toLocaleString('es-PE')}</h3>
            <Banknote className="h-6 w-6 text-emerald-300" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/4">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Estado</label>
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 outline-none"
            >
              <option value="Todos">Todos los estados</option>
              <option value="PENDING">En negociación</option>
              <option value="QUOTED">Pendiente de formalización</option>
              <option value="APPROVED">Aprobado</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="w-full md:w-1/4">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Rango de Fecha</label>
          <Input 
            type="month" 
            className="text-sm h-[42px]" 
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="w-full md:w-1/4">
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Tipo de Prenda</label>
          <div className="relative">
            <select 
              value={garmentFilter}
              onChange={(e) => { setGarmentFilter(e.target.value); setCurrentPage(1); }}
              className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 outline-none"
            >
              <option value="Todos">Cualquier prenda</option>
              {uniqueGarmentTypes.map((type: string) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="w-full md:w-auto ml-auto">
          <Button 
            variant="outline" 
            onClick={handleClearFilters}
            className="w-full md:w-auto flex items-center gap-2 h-[42px] border-slate-300 text-slate-700"
          >
            <Filter className="h-4 w-4" /> Limpiar
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
                  const clientInitial = quote.client?.name?.charAt(0).toUpperCase() || "C";
                  
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
                          <span className="font-medium text-slate-900 line-clamp-1">{quote.client?.name || "Cliente General"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {formatDateString(quote.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                          <Shirt className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-700 line-clamp-1 max-w-[120px]" title={`${quote.garmentType} ${quote.fabricType}`}>
                            {quote.garmentType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {quote.quotedPrice ? <span className="font-semibold text-slate-900">S/ {Number(quote.quotedPrice).toFixed(2)}</span> : "Por definir"}
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
              <select disabled className="appearance-none bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded focus:outline-none py-1 pl-2 pr-6 cursor-not-allowed">
                <option>{itemsPerPage}</option>
              </select>
              <ChevronDown className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}