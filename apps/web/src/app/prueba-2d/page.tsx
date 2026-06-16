'use client';

import dynamic from 'next/dynamic';

// ⚠️ IMPORTANTE: Así se importa un componente de Canvas en Next.js
const CustomizerDinamico = dynamic(
  () => import('@/components/Customizer/Customizer'), 
  { ssr: false, loading: () => <p className="text-center p-10">Cargando probador 2D...</p> }
);

export default function NuevaCotizacionPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Editor de Cotización</h1>
      <p className="text-gray-600 mb-8">
        Ajusta el diseño del cliente para obtener las coordenadas exactas de la matriz.
      </p>

      {/* Aquí insertas tu componente de forma segura */}
      <CustomizerDinamico />
      
    </div>
  );
}