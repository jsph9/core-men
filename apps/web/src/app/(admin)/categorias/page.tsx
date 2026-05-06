"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Gestión de Categorías</h2>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">+ Nueva Categoría</Button>
      </div>
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Categorías del Catálogo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">Gestiona las categorías de productos aquí.</p>
        </CardContent>
      </Card>
    </div>
  );
}
