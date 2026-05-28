"use client";

import { Button } from "@/components/ui/button";

export default function PerfilError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8">
      <div className="mx-auto mt-20 max-w-xl rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1A1A2E]">No se pudo cargar tu perfil</h2>
        <p className="mt-2 text-sm text-gray-500">Intenta de nuevo para continuar.</p>
        <Button onClick={reset} className="mt-4 rounded-lg bg-[#2E75B6]">Reintentar</Button>
      </div>
    </div>
  );
}
