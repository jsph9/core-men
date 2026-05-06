"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Search, ShoppingCart, User, SlidersHorizontal, ChevronRight } from "lucide-react";

const CATEGORIES = ["Todos", "Polos", "Poleras", "Casacas", "Pantalones"];

export default function CatalogoPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["products", search, page, activeCategory],
    queryFn: () => {
      let url = `/api/products?page=${page}&limit=12&search=${search}`;
      // In a real app, we'd pass category to the backend. For now, we simulate it.
      return apiGet(url);
    },
  });

  // Client-side filtering just for the mockup if backend doesn't support category filtering yet
  const filteredProducts = data?.data?.filter((p: any) => 
    activeCategory === "Todos" || p.category?.name === activeCategory
  ) || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Premium Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-slate-900">
            Core<span className="text-blue-600">Men</span>
          </Link>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Buscar productos, estilos, telas..." 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
              className="w-full pl-10 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-full" 
            />
          </div>

          <div className="flex items-center gap-3">
            <Link href="/carrito">
              <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full">
                <ShoppingCart className="h-5 w-5" />
                {/* Simulated badge */}
                <span className="absolute top-1 right-1 h-2 w-2 bg-blue-600 rounded-full border border-white"></span>
              </Button>
            </Link>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <Link href="/auth/login">
              <Button variant="ghost" className="hidden sm:flex text-slate-600 hover:text-slate-900 font-medium rounded-full">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-full shadow-sm">
                Crear Cuenta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0 space-y-8">
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Categorías
            </h3>
            <div className="space-y-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setPage(1); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${
                    activeCategory === cat 
                      ? "bg-slate-900 text-white font-medium shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {cat}
                  {activeCategory === cat && <ChevronRight className="h-4 w-4 opacity-50" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Promociones Activas</h3>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
              <Badge variant="default" className="bg-blue-600 mb-2">Por Volumen</Badge>
              <p className="text-sm text-slate-700 font-medium leading-snug">Hasta 15% de descuento en pedidos mayores a 500 unidades.</p>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Catálogo</h1>
              <p className="text-slate-500 mt-1">Explora nuestra colección de prendas premium.</p>
            </div>
            <span className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
              {isLoading ? "Cargando..." : `${filteredProducts.length} resultados`}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="aspect-[4/5] bg-slate-200 rounded-2xl animate-pulse" />
                  <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No se encontraron productos</h3>
              <p className="text-slate-500 mt-1 max-w-sm mx-auto">Intenta ajustar tus filtros o realiza una nueva búsqueda.</p>
              <Button variant="outline" className="mt-6 rounded-full" onClick={() => {setSearch(""); setActiveCategory("Todos");}}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                {filteredProducts.map((product: any) => (
                  <Link key={product.id} href={`/catalogo/${product.id}`} className="group">
                    <div className="aspect-[4/5] bg-slate-100 rounded-2xl mb-4 overflow-hidden relative border border-slate-200/50">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0].url} 
                          alt={product.name} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500">
                          👕
                        </div>
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                        <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-full font-medium">
                          Ver detalles
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">{product.category?.name || "Sin categoría"}</p>
                          <h3 className="font-semibold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </h3>
                        </div>
                        <p className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-sm shrink-0">
                          {formatCurrency(Number(product.basePrice))}
                        </p>
                      </div>
                      {product.fabric && (
                        <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          Tela: {product.fabric.value}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-16 pt-8 border-t border-slate-200">
                  <Button 
                    variant="outline" 
                    className="rounded-full"
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-4 py-2 rounded-full">
                    {data.meta.page} de {data.meta.totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    className="rounded-full"
                    disabled={page >= data.meta.totalPages} 
                    onClick={() => setPage(p => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
