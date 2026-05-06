// Email template: OrderReceiptEmail
export const OrderReceiptEmail = ({ orderId, total }: { orderId: string; total: string }) => ({
  subject: `Comprobante de pago - Pedido #${orderId}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a2e;">¡Gracias por tu compra!</h1>
      <p>Tu pedido <strong>#${orderId}</strong> ha sido registrado.</p>
      <p>Total pagado: <strong>S/ ${total}</strong></p>
      <p>Adjuntamos tu comprobante en PDF.</p>
    </div>
  `,
});
