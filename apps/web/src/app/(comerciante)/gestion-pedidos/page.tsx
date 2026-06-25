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
  Banknote, 
  Eye, 
  Shirt,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Brush,
  PackageSearch
} from "lucide-react";

export default function PedidosComerciante() {
  // 1. Estados para los Filtros
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [garmentFilter, setGarmentFilter] = useState("Todos");
  const [clientSearchFilter, setClientSearchFilter] = useState("");
  
  // 2. Estados para la Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // 3. Consulta de Pedidos (usamos el endpoint de quotes, ya que pedidos son quotes en ciertos estados)
  const { data: quotes = [], isLoading } = useQuery<any>({ 
    queryKey: ["merchant-quotes"],
    queryFn: () => apiGet("/api/merchant/quotes") 
  });

  // Regla de Negocio: Pedidos activos o cancelados formalizados
  // Regla de Negocio: Pedidos activos o cancelados
  const ordersList = useMemo(() => {
    const statusOrder: Record<string, number> = {
      WAITING_PAYMENT: 1,
      IN_PRODUCTION: 2,
      READY_FOR_PICKUP: 3,
      DELIVERED: 4,
      CANCELLED: 5,
    };

    return quotes
      .filter((q: any) => {
        // AHORA: Simplemente validamos que el estado esté en esta lista, incluyendo CANCELLED
        const isValidStatus = ["WAITING_PAYMENT", "IN_PRODUCTION", "READY_FOR_PICKUP", "DELIVERED", "CANCELLED"].includes(q.status);
        return isValidStatus;
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
  
  // 4. Extracción dinámica de Tipos de Prenda
  const uniqueGarmentTypes = useMemo(() => {
    if (!ordersList || ordersList.length === 0) return [];
    const typesSet = new Set<string>();
    ordersList.forEach((q: any) => {
      if (q.items) {
        q.items.forEach((item: any) => {
          const catName = item.productVariant?.product?.category?.name;
          if (catName) typesSet.add(catName);
        });
      }
    });
    return Array.from(typesSet) as string[];
  }, [ordersList]);

  // 5. Cálculos fijos para los KPIs superiores
  const waitingPaymentCount = ordersList.filter((q: any) => q.status === "WAITING_PAYMENT").length;
  const inProductionCount = ordersList.filter((q: any) => q.status === "IN_PRODUCTION").length;
  
  const activeOrders = useMemo(() => {
    return ordersList.filter((q: any) => q.status !== "CANCELLED" && q.status !== "DELIVERED");
  }, [ordersList]);

  const maxOrderValue = useMemo(() => {
    if (activeOrders.length === 0) return 0;
    return Math.max(...activeOrders.map((q: any) => Number(q.finalPrice || q.customerPrice || q.estimatedPrice) || 0));
  }, [activeOrders]);

  const maxOrderId = useMemo(() => {
    if (activeOrders.length === 0) return null;
    let maxQuote = activeOrders[0];
    let maxVal = Number(maxQuote.finalPrice || maxQuote.customerPrice || maxQuote.estimatedPrice) || 0;
    
    for (let i = 1; i < activeOrders.length; i++) {
      const val = Number(activeOrders[i].finalPrice || activeOrders[i].customerPrice || activeOrders[i].estimatedPrice) || 0;
      if (val > maxVal) {
        maxVal = val;
        maxQuote = activeOrders[i];
      }
    }
    return maxQuote.id;
  }, [activeOrders]);

  const sumOrderValue = useMemo(() => {
    return activeOrders.reduce((acc: number, q: any) => acc + (Number(q.finalPrice || q.customerPrice || q.estimatedPrice) || 0), 0);
  }, [activeOrders]);

  // 6. Lógica de Filtrado en Tiempo Real
  const filteredOrders = useMemo(() => {
    return ordersList.filter((quote: any) => {
      let matchesStatus = true;
      if (statusFilter !== "Todos") {
        matchesStatus = quote.status === statusFilter;
      }

      const garmentNames = quote.items?.map((item: any) => item.productVariant?.product?.category?.name) || [];
      const matchesGarment = garmentFilter === "Todos" || garmentNames.includes(garmentFilter);

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
  }, [ordersList, statusFilter, garmentFilter, startDateFilter, endDateFilter, clientSearchFilter]);

  // 7. Lógica de Paginación Dinámica
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, itemsPerPage]);

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
      case "WAITING_PAYMENT":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
            Pendiente de Pago
          </div>
        );
      case "IN_PRODUCTION":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            En Producción
          </div>
        );
      case "READY_FOR_PICKUP":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime-50 border border-lime-200 text-lime-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-lime-500"></div>
            Listo para Recojo
          </div>
        );
      case "DELIVERED":
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            Entregado
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
        <p className="text-sm text-slate-500 mb-1">Gestión Comercial / <span className="font-semibold text-slate-900">Pedidos</span></p>
        <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Bandeja de Pedidos</h1>
        <p className="text-slate-500 text-sm">Gestiona los pedidos confirmados, en producción y entregas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">Pendientes de Pago</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-orange-600">{waitingPaymentCount}</h3>
            <Banknote className="h-6 w-6 text-orange-300" strokeWidth={2.5} />
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">En Producción</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-blue-600">{inProductionCount}</h3>
            <PackageSearch className="h-6 w-6 text-blue-300" strokeWidth={2.5} />
          </div>
        </div>

        {maxOrderId ? (
          <Link 
            href={`/gestion-pedidos/${maxOrderId}`}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <p className="text-sm text-slate-500 font-medium group-hover:text-blue-600 transition-colors">Mayor Pedido</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-[#0F172A]">S/ {maxOrderValue.toLocaleString('es-PE')}</h3>
              <TrendingUp className="h-6 w-6 text-slate-300 group-hover:text-blue-600 transition-colors" strokeWidth={2.5} />
            </div>
          </Link>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <p className="text-sm text-slate-500 font-medium">Mayor Pedido</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-[#0F172A]">S/ 0.00</h3>
              <TrendingUp className="h-6 w-6 text-slate-300" strokeWidth={2.5} />
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-slate-500 font-medium">Valor Total en Pedidos Activos</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-3xl font-bold text-emerald-500">S/ {sumOrderValue.toLocaleString('es-PE')}</h3>
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
              <option value="WAITING_PAYMENT">Pendiente de Pago</option>
              <option value="IN_PRODUCTION">En Producción</option>
              <option value="READY_FOR_PICKUP">Listo para Recojo</option>
              <option value="DELIVERED">Entregado</option>
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
                <th className="px-6 py-4 font-semibold">VALOR DEL PEDIDO</th>
                <th className="px-6 py-4 font-semibold text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">Cargando pedidos...</td></tr>
              ) : paginatedOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">No se encontraron pedidos que coincidan con los filtros.</td></tr>
              ) : (
                paginatedOrders.map((quote: any) => {
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
                        #PD-{quote.id.slice(0, 6).toUpperCase()}
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
                        <span className="font-semibold text-slate-900">S/ {Number(quote.finalPrice || quote.customerPrice || quote.estimatedPrice || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link 
                          href={`/gestion-pedidos/${quote.id}`}
                          className="inline-flex p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Ver detalles del pedido"
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

        {/* Pagination Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div>
            Mostrando <span className="font-semibold text-slate-900">
              {filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredOrders.length)}
            </span> de <span className="font-semibold text-slate-900">{filteredOrders.length}</span> pedidos
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
