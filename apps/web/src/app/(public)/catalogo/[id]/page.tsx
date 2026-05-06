"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronLeft, Minus, Plus, ShoppingCart, Truck, ArrowRight, Check } from "lucide-react";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Unwrap params using React.use() to comply with Next.js 15+ requirements
  const { id } = use(params);

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const { data: product, isLoading } = useQuery<any>({
    queryKey: ["product", id],
    queryFn: () => apiGet(`/api/products/${id}`),
  });

  const addToCart = useMutation({
    mutationFn: (data: any) => apiPost("/api/cart/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Añadido al carrito", {
        description: `${quantity}x ${product.name} (${selectedSize}, ${selectedColor})`,
        action: {
          label: "Ver Carrito",
          onClick: () => router.push("/carrito"),
        },
      });
    },
    onError: (err: any) => {
      // If 401, redirect to login
      if (err.message.includes("401")) {
        toast.error("Debes iniciar sesión para añadir productos al carrito.");
        router.push("/auth/login");
      } else {
        toast.error("Error", { description: err.message });
      }
    }
  });

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) {
      toast.error("Selecciona talla y color", { description: "Debes elegir todas las opciones antes de añadir al carrito." });
      return;
    }

    // Find the variant ID
    const variant = product?.variants?.find((v: any) => v.color === selectedColor && v.size?.value === selectedSize);
    
    if (!variant) {
      toast.error("Variante no disponible", { description: "Esta combinación de talla y color está agotada." });
      return;
    }

    addToCart.mutate({ productVariantId: variant.id, quantity });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col pt-16">
        <div className="max-w-7xl mx-auto px-6 w-full flex gap-12">
          <div className="w-1/2 aspect-[4/5] bg-slate-200 animate-pulse rounded-2xl" />
          <div className="w-1/2 space-y-6">
            <div className="h-8 bg-slate-200 animate-pulse rounded w-3/4" />
            <div className="h-6 bg-slate-200 animate-pulse rounded w-1/4" />
            <div className="h-32 bg-slate-200 animate-pulse rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Producto no encontrado</h2>
        <Link href="/catalogo"><Button variant="outline">Volver al Catálogo</Button></Link>
      </div>
    );
  }

  // Extract unique colors and sizes from variants
  const colors = Array.from(new Set(product.variants?.map((v: any) => v.color))) as string[];
  const sizes = Array.from(new Set(product.variants?.map((v: any) => v.size?.value))) as string[];

  // Calculate dynamic price based on quantity (Mockup logic for visual feedback)
  const basePrice = Number(product.basePrice);
  let discountPct = 0;
  if (quantity >= 500) discountPct = 15;
  else if (quantity >= 101) discountPct = 10;
  else if (quantity >= 50) discountPct = 5;
  
  const unitPrice = basePrice * (1 - discountPct / 100);
  const totalPrice = unitPrice * quantity;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24">
      {/* Premium Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/catalogo">
              <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <span className="text-sm font-medium text-slate-500 hidden sm:block">Volver al catálogo</span>
          </div>
          <Link href="/carrito">
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 md:py-12 w-full grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-[4/5] bg-slate-100 rounded-3xl overflow-hidden relative border border-slate-200 shadow-sm">
            {product.images?.[0] ? (
              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-9xl bg-gradient-to-br from-slate-100 to-slate-200">
                👕
              </div>
            )}
            
            {product.fabric && (
              <div className="absolute top-4 left-4">
                <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-slate-900 border-none shadow-sm py-1.5 px-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 inline-block"></span>
                  {product.fabric.value}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Thumbnails placeholder */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map(i => (
              <button key={i} className={`w-20 h-24 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${i === 1 ? 'border-blue-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xl">👕</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Product Details & CTA */}
        <div className="flex flex-col">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">
              {product.name}
            </h1>
            <p className="text-lg text-slate-500 mb-6">{product.category?.name || "Prenda"}</p>
            
            <div className="flex items-end gap-3 mb-2">
              <span className="text-3xl font-bold text-blue-600">{formatCurrency(unitPrice)}</span>
              {discountPct > 0 && (
                <span className="text-lg text-slate-400 line-through mb-1">{formatCurrency(basePrice)}</span>
              )}
            </div>
            {discountPct > 0 && (
              <Badge className="bg-green-100 text-green-800 border-none px-2 py-0.5">
                -{discountPct}% aplicado por volumen
              </Badge>
            )}
          </div>

          <div className="h-px w-full bg-slate-200 mb-8"></div>

          {/* Selectors */}
          <div className="space-y-6 mb-10">
            {/* Color */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Color</h3>
                <span className="text-sm text-slate-500">{selectedColor || "Selecciona uno"}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {colors.map(color => (
                  <button 
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`h-12 px-5 rounded-full border text-sm font-medium transition-all ${
                      selectedColor === color 
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Talla</h3>
                <span className="text-sm text-blue-600 hover:underline cursor-pointer">Guía de tallas</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {sizes.map(size => (
                  <button 
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-14 h-14 rounded-2xl border text-base font-semibold transition-all flex items-center justify-center ${
                      selectedSize === size 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600 shadow-sm' 
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quantity & CTA */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6 mt-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Cantidad</h3>
              
              <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-sm">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-14 text-center font-bold text-slate-900 text-lg">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Volume Discount Hint */}
            {quantity < 50 && (
              <div className="bg-blue-50/50 rounded-xl p-3 text-sm text-blue-800 border border-blue-100 flex items-start gap-3">
                <div className="mt-0.5">💡</div>
                <p>
                  Si compras <span className="font-bold">50 unidades</span> el precio unitario baja a 
                  <span className="font-bold"> {formatCurrency(basePrice * 0.95)}</span> (-5%).
                </p>
              </div>
            )}

            <Button 
              onClick={handleAddToCart}
              disabled={addToCart.isPending}
              className="w-full h-14 text-lg rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-white font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              {addToCart.isPending ? "Añadiendo..." : "Añadir al carrito"}
              <span className="w-px h-5 bg-white/20"></span>
              {formatCurrency(totalPrice)}
            </Button>

            <div className="flex justify-center items-center gap-2 text-sm text-slate-500">
              <Truck className="h-4 w-4" />
              <span>Envío disponible a nivel nacional. <Link href="/personalizar" className="text-blue-600 hover:underline">O personalízalo con tu diseño</Link></span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
