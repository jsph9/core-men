const fs = require('fs');

const origPath = '/Users/jsph/Documents/Ingesoft/core-men/apps/web/src/app/(comerciante)/gestion-cotizaciones/[id]/page.tsx';
const destPath = '/Users/jsph/Documents/Ingesoft/core-men/apps/web/src/app/(comerciante)/gestion-pedidos/[id]/page.tsx';

let content = fs.readFileSync(origPath, 'utf8');

// 1. Rename Component
content = content.replace('export default function CotizacionDetalleComerciante()', 'export default function PedidoDetalleComerciante()');

// 2. Change Import of lucide-react to include Wallet, Package, PackageCheck, Truck
content = content.replace('import { \n  Search, ', 'import { \n  Wallet, Package, PackageCheck, Truck, Search, ');

// 3. Replace ORDER_STEPS instead of stepperSteps
const orderStepsDef = `
const ORDER_STEPS = [
  { id: "WAITING_PAYMENT", label: "Pendiente Pago", icon: Wallet },
  { id: "IN_PRODUCTION", label: "En Producción", icon: Package },
  { id: "READY_FOR_PICKUP", label: "Listo para Recojo", icon: PackageCheck },
  { id: "DELIVERED", label: "Entregado", icon: Truck }
];

const nextStatusMap: Record<string, string> = {
  WAITING_PAYMENT: "IN_PRODUCTION",
  IN_PRODUCTION: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "DELIVERED",
};
`;

content = content.replace('const stepperSteps = [', orderStepsDef + '\n/* stepperSteps removed */\nconst stepperSteps = [');

// 4. Update the logic inside the component to add advanceOrder and cancelOrder
const mutationsToAdd = `
  const advanceOrder = useMutation({
    mutationFn: (status: string) => apiPatch(\`/api/orders/merchant/\${id}/status\`, { status }),
    onSuccess: () => {
      toast.success("Estado del pedido actualizado");
      setActiveModal(null);
      queryClient.invalidateQueries({ queryKey: ["quote-detail", id] });
    },
    onError: (err: any) => toast.error("Error", { description: err.message })
  });

  const cancelOrder = useMutation({
    mutationFn: (data: { rejectionReason: string }) => apiPatch(\`/api/merchant/quotes/\${id}/reject\`, data),
    onSuccess: () => {
      toast.success("Pedido cancelado");
      setActiveModal(null);
      queryClient.invalidateQueries({ queryKey: ["quote-detail", id] });
    },
    onError: (err: any) => toast.error("Error", { description: err.message })
  });
`;

content = content.replace('const respondQuote = useMutation({', mutationsToAdd + '\n  const respondQuote = useMutation({');

// 5. Replace breadcrumb texts
content = content.replace(/Cotizaciones \{'>'\} <span className="font-semibold text-slate-900">Cotización #/g, `Pedidos {'>'} <span className="font-semibold text-slate-900">Pedido #`);
content = content.replace(/Detalle de Cotización/g, 'Detalle del Pedido');
content = content.replace(/href="\/gestion-cotizaciones"/g, 'href="/gestion-pedidos"');

// 6. Replace the stepper UI (between {/* Stepper Timeline */} and </div>\n          </div>)
const stepperRegex = /\{\/\* Stepper Timeline \*\/\}[\s\S]*?\{\/\* ZONA BLANCA: DISEÑO SOLICITADO \*\/\}/;

const newStepperUI = `
          {/* Progress Bar Pedidos */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-start w-full max-w-4xl mx-auto py-2">
              {ORDER_STEPS.map((step, idx) => {
                const isCancelled = quote?.status === "CANCELLED" || quote?.payments?.some((p:any) => p.status === "FAILED");
                let state = "pending";
                const currentIndex = ORDER_STEPS.findIndex(s => s.id === quote?.status);
                if (isCancelled) state = "cancelled";
                else if (currentIndex !== -1) {
                  if (idx < currentIndex) state = "completed";
                  else if (idx === currentIndex) state = "current";
                }

                const getLineClass = (s) => {
                  if (s === "completed") return "bg-emerald-500";
                  if (s === "current") return "bg-blue-500";
                  if (s === "cancelled") return "bg-red-500";
                  return "bg-slate-200";
                };

                const leftLineColor = getLineClass(state);
                
                let nextStepState = "pending";
                if (idx < ORDER_STEPS.length - 1) {
                  if (isCancelled) nextStepState = "cancelled";
                  else if (currentIndex !== -1) {
                    if (idx + 1 < currentIndex) nextStepState = "completed";
                    else if (idx + 1 === currentIndex) nextStepState = "current";
                  }
                }
                const rightLineColor = getLineClass(nextStepState);
                
                const StepIcon = step.icon;
                let statusTextColor = "text-slate-400";
                if (state === "completed") statusTextColor = "text-emerald-600 font-semibold";
                else if (state === "current") statusTextColor = "text-blue-600 font-semibold";
                else if (state === "cancelled") statusTextColor = "text-red-600 font-semibold";

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center relative">
                    {idx > 0 && <div className={\`absolute left-0 right-1/2 top-6 h-[4px] -translate-y-1/2 z-0 transition-all duration-500 \${leftLineColor}\`} />}
                    {idx < ORDER_STEPS.length - 1 && <div className={\`absolute left-1/2 right-0 top-6 h-[4px] -translate-y-1/2 z-0 transition-all duration-500 \${rightLineColor}\`} />}

                    <div className={\`w-12 h-12 rounded-full border-[3px] flex items-center justify-center z-10 bg-white transition-all duration-500 \${
                      state === "completed" ? "border-emerald-500 text-emerald-500" :
                      state === "current" ? "border-blue-500 text-blue-500 shadow-md ring-4 ring-blue-50" :
                      state === "cancelled" ? "border-red-500 text-red-500 shadow-md ring-4 ring-red-50" :
                      "border-slate-200 text-slate-300"
                    }\`}>
                      {state === "cancelled" ? <XCircle className="w-5 h-5" strokeWidth={2.5} /> : <StepIcon className="w-5 h-5" strokeWidth={state === "current" ? 2.5 : 2} />}
                    </div>
                    <div className="mt-3 text-center px-2">
                      <p className={\`text-xs transition-colors duration-500 \${statusTextColor}\`}>{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {(quote?.status === "CANCELLED" || quote?.payments?.some((p:any) => p.status === "FAILED")) && (
              <div className="text-center mt-4">
                <span className="text-red-600 font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                  Pedido Cancelado
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 mx-6">
          {/* ZONA BLANCA: DISEÑO SOLICITADO */}`;

content = content.replace(stepperRegex, newStepperUI);


// 7. Replace bottom buttons 
const bottomRegex = /\{\/\* BOTONERA INFERIOR:[\s\S]*?\{\/\* MODALES \*\/\}/;
const newBottomUI = `
      {/* BOTONERA INFERIOR: Contenedor sticky */}
      <div className="sticky bottom-0 w-full z-40 bg-transparent mt-auto">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.08),_0_-10px_15px_-3px_rgba(0,0,0,0.03)] mx-6 mb-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 justify-between items-center">
            <p className="text-sm text-slate-500 hidden md:block">Acciones del pedido</p>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                onClick={() => setActiveModal("CANCEL_ORDER")}
                disabled={quote?.status === "CANCELLED" || quote?.status === "DELIVERED" || quote?.status === "WAITING_PAYMENT" || quote?.payments?.some((p:any) => p.status === "FAILED")}
              >
                Cancelar Pedido
              </Button>
              <Button
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                onClick={() => setActiveModal("UPDATE_ORDER")}
                disabled={quote?.status === "CANCELLED" || quote?.status === "DELIVERED" || quote?.status === "WAITING_PAYMENT" || quote?.payments?.some((p:any) => p.status === "FAILED") || !nextStatusMap[quote?.status]}
              >
                Actualizar Estado
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALES */}`;

content = content.replace(bottomRegex, newBottomUI);

// 8. Replace "VALOR DE COTIZACIÓN ESTIMADO" to "VALOR FINAL" and use finalPrice
content = content.replace(/VALOR DE COTIZACIÓN ESTIMADO/g, 'VALOR FINAL');
content = content.replace(/S\/ \{quotedPrice \? Number\(quotedPrice\)\.toFixed\(2\) : "0\.00"\}/g, 'S/ {Number(quote?.finalPrice || quote?.customerPrice || quote?.estimatedPrice || 0).toFixed(2)}');

// 9. Add the modales
const modalsToAdd = `
      {/* Modal UPDATE_ORDER */}
      <Dialog open={activeModal === "UPDATE_ORDER"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" /> Actualizar Estado
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea avanzar el pedido al siguiente estado?
              El siguiente estado será: <span className="font-bold">{ORDER_STEPS.find(s => s.id === nextStatusMap[quote?.status])?.label || "Desconocido"}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={advanceOrder.isPending}>Volver</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => {
                const next = nextStatusMap[quote?.status];
                if (next) advanceOrder.mutate(next);
              }}
              disabled={advanceOrder.isPending}
            >
              {advanceOrder.isPending ? "Actualizando..." : "Confirmar Avance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal CANCEL_ORDER */}
      <Dialog open={activeModal === "CANCEL_ORDER"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Cancelar Pedido
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea cancelar este pedido? Deberá proporcionar una razón.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Razón de cancelación</label>
            <Textarea 
              placeholder="Explique el motivo..."
              className="min-h-[100px]"
              onChange={(e) => {
                // To avoid creating a new state, we can reuse unfeasibleReason or rejectionReason state from the original file
                setRejectionReason(e.target.value);
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActiveModal(null)} disabled={cancelOrder.isPending}>Volver</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => cancelOrder.mutate({ rejectionReason })}
              disabled={cancelOrder.isPending} // requires rejectionReason
            >
              {cancelOrder.isPending ? "Cancelando..." : "Confirmar Cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

content = content.replace(/\{\/\* Modal 1: VIABLE \*\/\}/, modalsToAdd + '\n      {/* Modal 1: VIABLE */}');

fs.writeFileSync(destPath, content);
console.log("Successfully rewritten page.tsx");
