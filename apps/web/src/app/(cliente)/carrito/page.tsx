"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Minus, Plus, ChevronLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";

const getDiscountLabel = (type: string, pct: number) => {
  if (type === "volume") return `Vol. ${pct}%`;
  if (type === "season") return `Temporada ${pct}%`;
  if (type === "combined") return `Combinado ${pct}%`;
  return null;
};

export default function CarritoPage() {
  const queryClient = useQueryClient();
  const { data: cart, isLoading } = useQuery<any>({ queryKey: ["cart"], queryFn: () => apiGet("/api/cart") });

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateQty = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => apiPatch(`/api/cart/items/${itemId}`, { quantity }),
    onMutate: (variables) => {
      setUpdatingId(variables.itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      setUpdatingId(null);
    },
    onError: (err) => {
      toast.error("Error al actualizar cantidad", { description: err.message });
      setUpdatingId(null);
    }
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => apiDelete(`/api/cart/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Producto eliminado");
    }
  });

  const emptyCart = useMutation({
    mutationFn: () => apiDelete("/api/cart"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.info("Carrito vaciado");
    }
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/catalogo">
              <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Tu Carrito de Compras</h1>
          </div>
          <Link href="/catalogo" className="text-sm font-medium text-blue-600 hover:underline hidden sm:block">
            Continuar comprando
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 md:py-12 w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : !cart?.items?.length ? (
          <div className="max-w-md mx-auto text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl opacity-50">🛒</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tu carrito está vacío</h2>
            <p className="text-slate-500 mb-8 px-8">Parece que aún no has añadido ningún producto. Explora nuestro catálogo para empezar.</p>
            <Link href="/catalogo">
              <Button className="rounded-full bg-blue-600 hover:bg-blue-700 px-8 py-6 text-base font-semibold shadow-md shadow-blue-600/20">
                Explorar Catálogo
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
            
            {/* Left: Items List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-900">Productos ({cart.items.length})</h2>
                <button 
                  onClick={() => { if(confirm("¿Seguro que deseas vaciar el carrito?")) emptyCart.mutate() }}
                  className="text-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  Vaciar carrito
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {cart.items.map((item: any, index: number) => {
                  const product = item.productVariant?.product;
                  const variant = item.productVariant;
                  const isUpdating = updatingId === item.id;

                  return (
                    <div 
                      key={item.id} 
                      className={`p-6 flex gap-6 ${index !== cart.items.length - 1 ? 'border-b border-slate-100' : ''} ${isUpdating ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-200`}
                    >
                      {/* Image */}
                      <Link href={`/catalogo/${product?.id}`} className="shrink-0">
                        <div className="w-24 h-32 bg-slate-100 rounded-xl overflow-hidden relative">
                          {product?.images?.[0] ? (
                            <Image src={product.images[0].url} alt={product?.name || "Producto"} fill sizes="96px" className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">👕</div>
                          )}
                        </div>
                      </Link>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <Link href={`/catalogo/${product?.id}`} className="hover:underline">
                              <h3 className="font-semibold text-slate-900 text-lg leading-tight">{product?.name || "Producto desconocido"}</h3>
                            </Link>
                            <p className="text-sm text-slate-500 mt-1">
                              Talla: <span className="font-medium text-slate-700">{variant?.size?.value}</span> | 
                              Color: <span className="font-medium text-slate-700">{variant?.color?.name}</span>
                            </p>
                          </div>
                          
                          <button 
                            onClick={() => removeItem.mutate(item.id)}
                            className="text-slate-400 hover:text-red-500 p-2 -mr-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Eliminar producto"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="flex items-end justify-between mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full p-1">
                            <button 
                              onClick={() => {
                                if (item.quantity > 1) updateQty.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900 transition-all disabled:opacity-50"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-10 text-center font-semibold text-slate-900 text-sm">
                              {item.quantity}
                            </div>
                            <button 
                              onClick={() => updateQty.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-900 transition-all"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            {item.discountType !== "none" ? (
                              <div className="space-y-1">
                                <p className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded inline-block">
                                  {getDiscountLabel(item.discountType, item.appliedDiscountPct)}
                                </p>
                                <p className="text-xs text-slate-400 line-through">
                                  {formatCurrency(Number(item.originalUnitPrice) * item.quantity)}
                                </p>
                                <p className="text-xs text-green-700 font-medium">Ahorro: {formatCurrency(Number(item.savingsAmount || 0))}</p>
                              </div>
                            ) : null}
                            <p className="font-bold text-slate-900 text-lg">{formatCurrency(Number(item.subtotal))}</p>
                          </div>
                        </div>
                        {item.thresholdHint && item.thresholdHint.missingUnits > 0 && item.thresholdHint.missingUnits <= 15 ? (
                          <div className="mt-3 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-3 text-sm text-blue-800">
                            Te faltan {item.thresholdHint.missingUnits} unidades de este producto para llegar a {item.thresholdHint.targetPercentage}% de descuento.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Resumen de Compra</h2>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal original</span>
                    <span>{formatCurrency(cart.items.reduce((acc: number, item: any) => acc + (Number(item.originalUnitPrice || 0) * item.quantity), 0))}</span>
                  </div>
                  
                  {/* Calculate total discounts for display */}
                  {(() => {
                    const originalTotal = cart.items.reduce((acc: number, item: any) => acc + (Number(item.originalUnitPrice || 0) * item.quantity), 0);
                    const currentTotal = Number(cart.totalAmount);
                    const totalSaved = originalTotal - currentTotal;
                    
                    if (totalSaved > 0) {
                      return (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Descuentos aplicados</span>
                          <span>-{formatCurrency(totalSaved)}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="h-px bg-slate-100"></div>
                  
                  <div className="flex justify-between items-end">
                    <span className="text-base font-semibold text-slate-900">Total a pagar</span>
                    <span className="text-3xl font-extrabold text-blue-600 tracking-tight">
                      {formatCurrency(Number(cart.totalAmount))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 text-right">Incluye impuestos.</p>
                </div>

                <Link href="/checkout" className="block w-full">
                  <Button className="w-full h-14 text-base rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]">
                    Proceder al Pago
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span>Pago seguro y encriptado por Stripe</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
