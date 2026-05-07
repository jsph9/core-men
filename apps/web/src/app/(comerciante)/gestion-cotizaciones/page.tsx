"use client";
import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { MessageSquare, Phone, CheckCircle, XCircle } from "lucide-react";

export default function CotizacionesComerciante() {
  const queryClient = useQueryClient();
  
  // Perfil del Comerciante
  const { data: userProfile } = useQuery<any>({ queryKey: ["merchant-profile"], queryFn: () => apiGet("/api/auth/me") });
  const [whatsapp, setWhatsapp] = useState("");
  
  // Cotizaciones
  const { data: quotes, isLoading } = useQuery<any>({ queryKey: ["merchant-quotes"], queryFn: () => apiGet("/api/merchant/quotes") });

  // Actualizar Perfil
  const updateProfile = useMutation({
    mutationFn: (whatsappNumber: string) => apiPut("/api/merchant/profile", { whatsappNumber }),
    onSuccess: () => {
      toast.success("Perfil actualizado", { description: "Número de WhatsApp guardado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["merchant-profile"] });
    }
  });

  // Responder Cotización
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [dialogType, setDialogType] = useState<"RESPOND" | "UNFEASIBLE" | null>(null);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [merchantMessage, setMerchantMessage] = useState("");
  const [unfeasibleReason, setUnfeasibleReason] = useState("");

  const respondMutation = useMutation({
    mutationFn: () => apiPut(`/api/merchant/quotes/${selectedQuote.id}/respond`, { 
      quotedPrice: parseFloat(quotedPrice), 
      merchantMessage 
    }),
    onSuccess: () => {
      toast.success("Cotización respondida exitosamente");
      setDialogType(null);
      queryClient.invalidateQueries({ queryKey: ["merchant-quotes"] });
    }
  });

  const unfeasibleMutation = useMutation({
    mutationFn: () => apiPut(`/api/merchant/quotes/${selectedQuote.id}/unfeasible`, { unfeasibleReason }),
    onSuccess: () => {
      toast.success("Cotización marcada como inviable");
      setDialogType(null);
      queryClient.invalidateQueries({ queryKey: ["merchant-quotes"] });
    }
  });

  const getStatusBadge = (status: string) => {
    const colors: any = {
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      QUOTED: "bg-blue-100 text-blue-800 border-blue-200",
      APPROVED: "bg-green-100 text-green-800 border-green-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      UNFEASIBLE: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return <Badge variant="outline" className={`${colors[status] || "bg-slate-100"} font-medium`}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Cotizaciones</h1>
            <p className="text-sm text-slate-500">Responde a solicitudes de cotización de clientes mayoristas.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
            <Phone className="h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Número WhatsApp" 
              className="h-8 w-36 text-sm bg-white" 
              defaultValue={userProfile?.whatsappNumber || ""}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <Button size="sm" className="h-8" onClick={() => updateProfile.mutate(whatsapp || userProfile?.whatsappNumber)}>
              Guardar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <Card key={i} className="h-64 animate-pulse bg-slate-100 border-none" />)}
          </div>
        ) : !quotes?.length ? (
          <Card className="text-center py-20 border-dashed border-2">
            <CardContent>
              <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Sin cotizaciones</h3>
              <p className="text-slate-500">No hay cotizaciones pendientes por revisar en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quotes.map((q: any) => (
              <Card key={q.id} className={`overflow-hidden transition-all ${q.status === 'PENDING' ? 'ring-2 ring-blue-500/20 shadow-md' : 'shadow-sm opacity-80 hover:opacity-100'}`}>
                <div className="flex flex-col md:flex-row h-full">
                  {/* Image Column */}
                  {q.designImageUrl ? (
                    <div className="w-full md:w-2/5 bg-slate-100 border-r relative min-h-[200px]">
                      <Image src={q.designImageUrl} alt="Diseno" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover p-2" unoptimized />
                    </div>
                  ) : (
                    <div className="w-full md:w-2/5 bg-slate-100 border-r flex items-center justify-center min-h-[200px]">
                      <span className="text-sm text-slate-400">Sin Diseño</span>
                    </div>
                  )}
                  
                  {/* Content Column */}
                  <div className="w-full md:w-3/5 p-5 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 font-mono text-xs border-transparent">#{q.id.slice(0, 8)}</Badge>
                      {getStatusBadge(q.status)}
                    </div>
                    
                    <h3 className="font-semibold text-slate-900 mb-1">{q.garmentType} {q.fabricType}</h3>
                    <p className="text-sm text-slate-600 mb-1">Cliente: <span className="font-medium text-slate-900">{q.client?.name}</span></p>
                    <p className="text-sm text-slate-600 mb-3">Cantidad: <span className="font-medium text-slate-900">{q.totalQuantity} unidades</span></p>
                    
                    {q.message && (
                      <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 italic border-l-2 border-slate-300 mb-4 flex-1">
                        &quot;{q.message}&quot;
                      </div>
                    )}
                    
                    {q.status === "PENDING" && (
                      <div className="grid grid-cols-2 gap-2 mt-auto pt-4">
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700" 
                          onClick={() => { setSelectedQuote(q); setQuotedPrice(""); setMerchantMessage(""); setDialogType("RESPOND"); }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Responder
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { setSelectedQuote(q); setUnfeasibleReason(""); setDialogType("UNFEASIBLE"); }}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Inviable
                        </Button>
                      </div>
                    )}

                    {q.status === "QUOTED" && (
                      <div className="mt-auto pt-4 border-t text-sm">
                        <p className="text-slate-500">Precio ofrecido: <strong className="text-slate-900">S/ {Number(q.quotedPrice).toFixed(2)}</strong></p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dialog: Responder con Precio */}
      <Dialog open={dialogType === "RESPOND"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Cotización #{selectedQuote?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              Propón un precio base o precio total para las {selectedQuote?.totalQuantity} unidades solicitadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Precio Cotizado (S/) *</label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="Ej. 1500.00" 
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mensaje para el Cliente</label>
              <Textarea 
                placeholder="Condiciones de entrega, aclaraciones sobre la tela..." 
                rows={3}
                value={merchantMessage}
                onChange={(e) => setMerchantMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={() => respondMutation.mutate()} 
              disabled={!quotedPrice || respondMutation.isPending}
            >
              {respondMutation.isPending ? "Enviando..." : "Enviar Cotización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Marcar Inviable */}
      <Dialog open={dialogType === "UNFEASIBLE"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><XCircle className="w-5 h-5" /> Marcar como Inviable</DialogTitle>
            <DialogDescription>
              Explica al cliente por qué no es posible procesar su diseño o solicitud. Se generará un enlace para que el cliente pueda contactarte por WhatsApp y discutir alternativas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Razón (Requerido) *</label>
              <Textarea 
                placeholder="Ej. El diseño tiene demasiados colores para este tipo de tela, la zona de impresión es inaccesible..." 
                rows={4}
                value={unfeasibleReason}
                onChange={(e) => setUnfeasibleReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
            <Button 
              variant="destructive"
              onClick={() => unfeasibleMutation.mutate()} 
              disabled={!unfeasibleReason || unfeasibleMutation.isPending}
            >
              {unfeasibleMutation.isPending ? "Procesando..." : "Confirmar Inviabilidad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
