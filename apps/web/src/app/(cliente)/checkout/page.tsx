"use client";
import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { apiPost, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function CheckoutForm({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    
    // Attempt payment
    const { error } = await stripe.confirmPayment({ 
      elements, 
      confirmParams: { 
        return_url: `${window.location.origin}/pedidos?payment_intent_success=true` 
      } 
    });
    
    if (error) {
      toast.error("El pago no pudo procesarse", { description: error.message || "Verifica tu tarjeta e intenta de nuevo." });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PaymentElement options={{ layout: "tabs" }} />
      
      <Button 
        type="submit" 
        disabled={!stripe || loading} 
        className="w-full h-14 text-base rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-md relative overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full" />
            <span>Procesando...</span>
          </div>
        ) : (
          <>
            <Lock className="h-4 w-4 text-slate-400" />
            <span>Pagar {formatCurrency(amount)}</span>
          </>
        )}
      </Button>

      <div className="flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>Tus datos están protegidos por encriptación TLS de 256 bits</span>
        </div>
        <p>Pagos procesados de forma segura por Stripe</p>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [sessionError, setSessionError] = useState("");

  const { data: cart, isLoading: isCartLoading } = useQuery<any>({ 
    queryKey: ["cart"], 
    queryFn: () => apiGet("/api/cart"),
    refetchOnMount: "always" // Always ensure cart is fresh for checkout
  });

  useEffect(() => {
    apiPost<{ clientSecret: string }>("/api/checkout/session", {})
      .then((res) => setClientSecret(res.clientSecret))
      .catch((err) => {
        setSessionError(err.message || "Error al iniciar sesión de pago");
        if(err.message.includes("400")) {
          // Cart is empty, redirect handled below
        }
      });
  }, []);

  if (sessionError) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">No se pudo iniciar el pago</h2>
        <p className="text-slate-500 mb-8 max-w-sm text-center">
          {sessionError === "Cart is empty" ? "Tu carrito está vacío." : "Ocurrió un problema al generar la sesión segura de Stripe."}
        </p>
        <Link href="/carrito">
          <Button className="rounded-full px-8">Volver al carrito</Button>
        </Link>
      </div>
    );
  }

  if (!clientSecret || isCartLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4">
        <div className="relative">
          <div className="animate-spin h-16 w-16 border-4 border-blue-100 border-t-blue-600 rounded-full"></div>
          <Lock className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-slate-500 font-medium mt-6">Conectando con pasarela segura...</p>
      </div>
    );
  }

  const amount = Number(cart?.totalAmount || 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/carrito">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver al Carrito
            </Button>
          </Link>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Core<span className="text-blue-600">Men</span>
          </span>
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto flex flex-col-reverse lg:flex-row min-h-[calc(100vh-64px)]">
        
        {/* Left: Payment Form */}
        <div className="flex-1 px-6 py-12 lg:pr-16 xl:pr-24 lg:py-16">
          <div className="max-w-lg mx-auto lg:ml-auto lg:mr-0">
            <div className="mb-10">
              <h1 className="text-2xl font-bold text-slate-900">Pago Seguro</h1>
              <p className="text-slate-500 text-sm mt-1">Ingresa tus datos para completar tu pedido.</p>
            </div>
            
            <Elements stripe={stripePromise} options={{ 
              clientSecret, 
              appearance: { 
                theme: "stripe",
                variables: {
                  colorPrimary: '#2563eb',
                  colorBackground: '#ffffff',
                  colorText: '#0f172a',
                  colorDanger: '#ef4444',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '8px',
                }
              } 
            }}>
              <CheckoutForm amount={amount} />
            </Elements>
          </div>
        </div>

        {/* Right: Order Summary Sidebar (Gray background) */}
        <div className="w-full lg:w-[45%] xl:w-[40%] bg-[#f8fafc] border-b lg:border-b-0 lg:border-l border-slate-200 px-6 py-12 lg:pl-10 xl:pl-16">
          <div className="max-w-md mx-auto lg:mr-auto lg:ml-0">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
              Resumen del Pedido
            </h2>

            {/* Item List */}
            <div className="space-y-4 mb-8">
              {cart?.items?.map((item: any) => {
                const product = item.productVariant?.product;
                return (
                  <div key={item.id} className="flex gap-4 items-start relative">
                    <div className="relative">
                      <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center text-xl shadow-sm">
                        {product?.images?.[0] ? (
                          <Image src={product.images[0].url} alt={product?.name || "Producto"} fill sizes="64px" className="object-cover" unoptimized />
                        ) : (
                          "👕"
                        )}
                      </div>
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-slate-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#f8fafc]">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-semibold text-slate-900 text-sm leading-tight">{product?.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{item.productVariant?.color} / {item.productVariant?.size?.value}</p>
                    </div>
                    <div className="text-right pt-1">
                      <p className="font-semibold text-slate-900 text-sm">{formatCurrency(Number(item.subtotal))}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-slate-200 mb-6 w-full"></div>

            {/* Totals */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(cart?.items?.reduce((acc: number, item: any) => acc + (Number(item.productVariant?.product?.basePrice || 0) * item.quantity), 0) || 0)}</span>
              </div>
              
              {/* Calculate total discounts for display */}
              {(() => {
                const originalTotal = cart?.items?.reduce((acc: number, item: any) => acc + (Number(item.productVariant?.product?.basePrice || 0) * item.quantity), 0) || 0;
                const totalSaved = originalTotal - amount;
                
                if (totalSaved > 0) {
                  return (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Descuentos</span>
                      <span>-{formatCurrency(totalSaved)}</span>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="flex justify-between text-sm text-slate-600">
                <span>Envío</span>
                <span className="text-slate-400 italic">Por calcular</span>
              </div>
            </div>

            <div className="h-px bg-slate-200 mb-6 w-full"></div>

            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-slate-900">Total</span>
              <span className="text-2xl font-extrabold text-slate-900">{formatCurrency(amount)}</span>
            </div>

            <div className="mt-8 bg-white border border-slate-200 rounded-xl p-4 flex gap-3 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 leading-snug">
                Tu pedido estará garantizado. Recibirás un correo de confirmación con tu comprobante tras el pago.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
