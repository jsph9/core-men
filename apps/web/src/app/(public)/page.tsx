import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Core<span className="text-blue-400">Men</span>
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/catalogo" className="text-sm text-gray-300 hover:text-white transition">Catálogo</Link>
          <Link href="/auth/login">
            <Button variant="outline" size="sm" className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white">
              Iniciar Sesión
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600">Registrarse</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-32">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="text-xs font-medium text-blue-400">Modelo Gamarra, Lima — Perú</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-extrabold leading-tight max-w-4xl bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
          Tu negocio textil, digitalizado
        </h2>
        <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl">
          Catálogo en línea, personalización de prendas, cotizaciones inteligentes y pagos seguros. Todo en una sola plataforma.
        </p>
        <div className="flex gap-4 mt-10">
          <Link href="/catalogo">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-base px-8">
              Explorar Catálogo
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-white/10 text-base px-8">
              Crear Cuenta
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-32 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: "🛒", title: "Compra Directa", desc: "Explora, selecciona variantes y paga en línea con descuentos automáticos por volumen." },
          { icon: "🎨", title: "Personalización Visual", desc: "Sube tu diseño, posiciónalo sobre la prenda y obtén un mockup en tiempo real." },
          { icon: "📋", title: "Cotizaciones Inteligentes", desc: "Envía solicitudes formales, negocia y convierte cotizaciones en pedidos." }
        ].map((f) => (
          <div key={f.title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <span className="text-4xl">{f.icon}</span>
            <h3 className="text-xl font-bold mt-4 mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        <p>© 2026 CoreMen — Grupo 3 · Ingeniería de Software · PUCP</p>
      </footer>
    </div>
  );
}
