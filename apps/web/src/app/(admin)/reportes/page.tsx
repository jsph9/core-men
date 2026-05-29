"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Layers, 
  Calendar, 
  RefreshCw,
  Search,
  ArrowUpRight,
  Shirt,
  CalendarDays
} from "lucide-react";

// Helper to get local date in YYYY-MM-DD format
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReportesPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // States
  const [dateFrom, setDateFrom] = useState<string>(getLocalDateString(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState<string>(getLocalDateString(today));
  const [preset, setPreset] = useState<string>("30d");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Query to fetch sales report
  const { data: sales = [], isLoading, isRefetching, refetch } = useQuery<any[]>({
    queryKey: ["reports-sales", dateFrom, dateTo],
    queryFn: () => {
      let url = "/api/admin/reports/sales";
      const params = [];
      if (dateFrom) params.push(`dateFrom=${dateFrom}T00:00:00.000Z`);
      if (dateTo) params.push(`dateTo=${dateTo}T23:59:59.999Z`);
      if (params.length > 0) url += `?${params.join("&")}`;
      return apiGet(url);
    }
  });

  // Apply presets
  const handlePresetChange = (selectedPreset: string) => {
    setPreset(selectedPreset);
    const end = new Date();
    const start = new Date();

    if (selectedPreset === "7d") {
      start.setDate(end.getDate() - 7);
      setDateFrom(getLocalDateString(start));
      setDateTo(getLocalDateString(end));
    } else if (selectedPreset === "30d") {
      start.setDate(end.getDate() - 30);
      setDateFrom(getLocalDateString(start));
      setDateTo(getLocalDateString(end));
    } else if (selectedPreset === "month") {
      const firstDay = new Date(end.getFullYear(), end.getMonth(), 1);
      setDateFrom(getLocalDateString(firstDay));
      setDateTo(getLocalDateString(end));
    } else if (selectedPreset === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  // 1. Calculations & Metrics
  const metrics = useMemo(() => {
    const confirmedSales = sales.filter((o: any) => o.payment?.status === "confirmed");
    const totalRevenue = confirmedSales.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
    const totalOrders = sales.length;
    const ticketPromedio = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const prendasVendidas = sales.reduce((sum: number, o: any) => {
      const itemsCount = o.items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0;
      return sum + itemsCount;
    }, 0);

    return {
      totalRevenue,
      totalOrders,
      ticketPromedio,
      prendasVendidas,
      confirmedCount: confirmedSales.length
    };
  }, [sales]);

  // 2. Top Products calculation
  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string; quantity: number; revenue: number; category?: string }> = {};

    sales.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const prod = item.productVariant?.product;
        if (!prod) return;

        const key = prod.name;
        if (!productMap[key]) {
          productMap[key] = {
            name: prod.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productMap[key].quantity += item.quantity;
        productMap[key].revenue += Number(item.subtotal || (item.quantity * item.unitPrice));
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales]);

  // 3. SVG Line Chart Data points calculation
  const chartData = useMemo(() => {
    if (sales.length === 0) return [];

    // Group sales by local date
    const dailyMap: Record<string, number> = {};
    sales.forEach((order: any) => {
      if (order.payment?.status !== "confirmed") return;
      const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + Number(order.totalAmount);
    });

    // Create days range based on filter or order bounds
    let startStr = dateFrom;
    let endStr = dateTo;

    if (!startStr || !endStr) {
      const timestamps = sales.map((o: any) => new Date(o.createdAt).getTime());
      if (timestamps.length > 0) {
        const minDate = new Date(Math.min(...timestamps));
        const maxDate = new Date(Math.max(...timestamps));
        startStr = getLocalDateString(minDate);
        endStr = getLocalDateString(maxDate);
      } else {
        startStr = getLocalDateString(thirtyDaysAgo);
        endStr = getLocalDateString(today);
      }
    }

    const start = new Date(startStr);
    const end = new Date(endStr);
    const days: { dateLabel: string; formattedDate: string; revenue: number }[] = [];
    
    const temp = new Date(start);
    while (temp <= end) {
      const key = getLocalDateString(temp);
      
      // Simple date formatting for label (e.g. "28 May")
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const dateLabel = `${temp.getDate()} ${monthNames[temp.getMonth()]}`;

      days.push({
        dateLabel,
        formattedDate: key,
        revenue: dailyMap[key] || 0,
      });

      // Avoid infinite loop in case of timezone errors
      temp.setDate(temp.getDate() + 1);
      if (days.length > 365) break; // Hard limit for safety
    }

    return days;
  }, [sales, dateFrom, dateTo]);

  // SVG Chart path calculation
  const svgChartInfo = useMemo(() => {
    const width = 600;
    const height = 240;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    if (chartData.length === 0) {
      return { path: "", areaPath: "", points: [], gridLines: [], xLabels: [], maxVal: 0 };
    }

    const maxVal = Math.max(...chartData.map(d => d.revenue), 1000) * 1.1; // 10% headroom

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = chartData.map((d, index) => {
      const x = paddingLeft + (chartData.length > 1 ? (index / (chartData.length - 1)) * chartWidth : chartWidth / 2);
      const y = paddingTop + chartHeight - (d.revenue / maxVal) * chartHeight;
      return { x, y, revenue: d.revenue, label: d.dateLabel };
    });

    // Build SVG Path strings
    let path = "";
    let areaPath = "";

    if (points.length > 0) {
      // Line path
      path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }

      // Closed area path
      areaPath = `${path} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }

    // Grid lines (y axis ticks)
    const gridLines = [];
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const val = (maxVal * i) / ticks;
      const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
      gridLines.push({ y, val });
    }

    // X Labels (sample a subset if there are many labels to avoid overlapping)
    const xLabels: typeof points = [];
    const labelSpacing = Math.ceil(chartData.length / 6);
    points.forEach((p, idx) => {
      if (idx % labelSpacing === 0 || idx === points.length - 1) {
        xLabels.push(p);
      }
    });

    return { path, areaPath, points, gridLines, xLabels, maxVal };
  }, [chartData]);

  // Filter sales based on search query (Client Name, Client Email, Order ID)
  const filteredSales = useMemo(() => {
    if (!searchQuery) return sales;
    const query = searchQuery.toLowerCase();
    return sales.filter((o: any) => 
      o.id.toLowerCase().includes(query) ||
      o.user?.name?.toLowerCase().includes(query) ||
      o.user?.email?.toLowerCase().includes(query)
    );
  }, [sales, searchQuery]);

  // 4. Export CSV handler
  const exportToCSV = () => {
    if (sales.length === 0) return;

    // Headers
    const headers = [
      "ID Pedido",
      "Fecha Creacion",
      "Cliente Nombre",
      "Cliente Email",
      "Prendas Cantidad",
      "Total Venta (PEN)",
      "Metodo de Pago",
      "Estado Pago",
      "Estado Pedido"
    ];

    // Rows
    const rows = sales.map((o: any) => {
      const clientName = o.user?.name || "Cliente Invitado";
      const clientEmail = o.user?.email || "—";
      const itemsCount = o.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
      const totalAmount = Number(o.totalAmount).toFixed(2);
      const paymentMethod = o.payment?.method || "—";
      const paymentStatus = o.payment?.status || "pending";
      
      return [
        o.id,
        new Date(o.createdAt).toISOString(),
        `"${clientName.replace(/"/g, '""')}"`,
        clientEmail,
        itemsCount,
        totalAmount,
        paymentMethod,
        paymentStatus,
        o.status
      ];
    });

    // Create CSV content
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Trigger download
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    // Set filename with selected date ranges
    const fileSuffix = dateFrom && dateTo ? `${dateFrom}_a_${dateTo}` : "completo";
    link.setAttribute("download", `reporte_ventas_coremen_${fileSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">Visualiza el rendimiento financiero y de inventario</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 px-3 bg-white" 
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          <Button 
            size="sm" 
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={exportToCSV}
            disabled={sales.length === 0}
          >
            <Download className="w-4 h-4 mr-2" /> 
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Date Range Selector and Preset Tags */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Desde</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    id="dateFrom" 
                    type="date" 
                    className="pl-10 h-10 w-full sm:w-[180px] bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm text-slate-900" 
                    value={dateFrom} 
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPreset("custom");
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Hasta</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    id="dateTo" 
                    type="date" 
                    className="pl-10 h-10 w-full sm:w-[180px] bg-slate-50 border-slate-200 focus:bg-white transition-all text-sm text-slate-900" 
                    value={dateTo} 
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPreset("custom");
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Filtros Rápidos</Label>
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg border border-slate-200/50">
                <button 
                  onClick={() => handlePresetChange("7d")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${preset === "7d" ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Últimos 7 días
                </button>
                <button 
                  onClick={() => handlePresetChange("30d")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${preset === "30d" ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Últimos 30 días
                </button>
                <button 
                  onClick={() => handlePresetChange("month")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${preset === "month" ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Este mes
                </button>
                <button 
                  onClick={() => handlePresetChange("all")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${preset === "all" ? "bg-white text-blue-600 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"}`}
                >
                  Todo
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all group duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ingresos Totales</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                {isLoading ? "..." : formatCurrency(metrics.totalRevenue)}
              </h3>
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 pt-1.5">
                <TrendingUp className="w-3 h-3" />
                Ventas Confirmadas
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-100 transition-all flex items-center justify-center shrink-0">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all group duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pedidos Totales</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                {isLoading ? "..." : metrics.totalOrders}
              </h3>
              <p className="text-xs text-slate-500 font-medium pt-1.5">
                {metrics.confirmedCount} Pagados • {metrics.totalOrders - metrics.confirmedCount} Pendientes
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 transition-all flex items-center justify-center shrink-0">
              <ShoppingBag className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Ticket Promedio */}
        <Card className="border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all group duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket Promedio</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                {isLoading ? "..." : formatCurrency(metrics.ticketPromedio)}
              </h3>
              <p className="text-xs text-slate-500 font-medium pt-1.5">
                Monto promedio por compra
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-50 group-hover:bg-violet-100 transition-all flex items-center justify-center shrink-0">
              <ArrowUpRight className="h-6 w-6 text-violet-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Units Sold */}
        <Card className="border-none shadow-sm overflow-hidden bg-white hover:shadow-md transition-all group duration-300">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Prendas Vendidas</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                {isLoading ? "..." : metrics.prendasVendidas}
              </h3>
              <p className="text-xs text-slate-500 font-medium pt-1.5">
                Volumen total de inventario vendido
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-100 transition-all flex items-center justify-center shrink-0">
              <Layers className="h-6 w-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Leaders Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (SVG) */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Tendencia Diaria de Ingresos (S/)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm">
                Cargando datos del gráfico...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[240px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                <CalendarDays className="h-10 w-10 text-slate-300" />
                <p className="text-sm">No hay ventas confirmadas en este rango de fechas.</p>
              </div>
            ) : (
              <div className="relative">
                {/* SVG Graphics */}
                <svg viewBox="0 0 600 240" className="w-full h-auto overflow-visible select-none">
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {svgChartInfo.gridLines.map((line, idx) => (
                    <g key={idx} className="opacity-40">
                      <line 
                        x1="60" 
                        y1={line.y} 
                        x2="580" 
                        y2={line.y} 
                        stroke="#E2E8F0" 
                        strokeWidth="1" 
                        strokeDasharray={idx === 0 ? "" : "4 4"}
                      />
                      <text 
                        x="50" 
                        y={line.y + 4} 
                        fill="#64748B" 
                        fontSize="9" 
                        textAnchor="end" 
                        fontWeight="500"
                      >
                        {formatCurrency(line.val).replace("S/", "").trim()}
                      </text>
                    </g>
                  ))}

                  {/* Filled Area */}
                  {svgChartInfo.areaPath && (
                    <path d={svgChartInfo.areaPath} fill="url(#salesGradient)" />
                  )}

                  {/* Line Curve */}
                  {svgChartInfo.path && (
                    <path 
                      d={svgChartInfo.path} 
                      fill="none" 
                      stroke="#2563EB" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Data Points */}
                  {svgChartInfo.points.map((p, idx) => (
                    <g key={idx} className="group/dot cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4" 
                        fill="#FFFFFF" 
                        stroke="#2563EB" 
                        strokeWidth="2" 
                        className="transition-all duration-200 group-hover/dot:r-6"
                      />
                      {/* Tooltip on dot hover */}
                      <title>{`${p.label}: S/ ${p.revenue.toFixed(2)}`}</title>
                    </g>
                  ))}

                  {/* X Axis Labels */}
                  {svgChartInfo.xLabels.map((label, idx) => (
                    <text 
                      key={idx} 
                      x={label.x} 
                      y="230" 
                      fill="#64748B" 
                      fontSize="9" 
                      fontWeight="500" 
                      textAnchor="middle"
                    >
                      {label.label}
                    </text>
                  ))}
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Products Leaderboard */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shirt className="w-5 h-5 text-indigo-500" />
              Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-slate-100 rounded-md animate-pulse"></div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-12 space-y-2">
                <Shirt className="h-10 w-10 text-slate-200" />
                <p className="text-sm">Sin datos de productos.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {topProducts.map((p, idx) => {
                  const maxQty = topProducts[0]?.quantity || 1;
                  const pct = (p.quantity / maxQty) * 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                          {idx + 1}. {p.name}
                        </span>
                        <span className="font-medium text-slate-500 text-xs shrink-0">
                          {p.quantity} uds. • <strong className="text-slate-900">{formatCurrency(p.revenue)}</strong>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Order List */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <CardTitle className="text-lg font-bold text-slate-900">Historial Detallado de Ventas</CardTitle>
          
          {/* Search bar inside list card */}
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Buscar por ID, cliente, email..." 
              className="pl-9 h-9.5 text-xs bg-slate-50 border-slate-200 focus:bg-white w-full rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-slate-500 text-sm">Cargando historial...</p>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No se encontraron registros de ventas que coincidan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">ID Pedido</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Cliente / Email</th>
                    <th className="px-6 py-4">Prendas</th>
                    <th className="px-6 py-4">Monto Total</th>
                    <th className="px-6 py-4">Pago / Método</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((o: any) => {
                    const clientName = o.user?.name || "Cliente Invitado";
                    const clientEmail = o.user?.email || "—";
                    const totalQty = o.items?.reduce((sum: number, it: any) => sum + it.quantity, 0) || 0;
                    
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* ID */}
                        <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                          {o.id.toUpperCase()}
                        </td>
                        
                        {/* Date */}
                        <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                          {formatDate(o.createdAt)}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800 text-xs">{clientName}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{clientEmail}</div>
                        </td>

                        {/* Quantity */}
                        <td className="px-6 py-4 font-bold text-slate-800 text-xs">
                          {totalQty} uds
                        </td>

                        {/* Total Amount */}
                        <td className="px-6 py-4 font-extrabold text-slate-900 text-xs">
                          {formatCurrency(Number(o.totalAmount))}
                        </td>

                        {/* Payment method and confirmation */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.payment?.status === "confirmed" 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {o.payment?.status === "confirmed" ? "Confirmado" : "Pendiente"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">
                              {o.payment?.method || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Order status badge */}
                        <td className="px-6 py-4 text-center">
                          <Badge 
                            variant={
                              o.status === "DELIVERED" ? "success" :
                              o.status === "REGISTERED" ? "default" :
                              o.status === "CANCELLED" ? "destructive" : "warning"
                            }
                          >
                            {o.status === "DELIVERED" ? "Entregado" :
                             o.status === "REGISTERED" ? "Registrado" :
                             o.status === "CANCELLED" ? "Cancelado" : o.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
