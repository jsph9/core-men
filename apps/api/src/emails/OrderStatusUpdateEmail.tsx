// Email template: OrderStatusUpdateEmail
export const OrderStatusUpdateEmail = ({ orderId, newStatus }: { orderId: string; newStatus: string }) => ({
  subject: `Actualización de tu pedido #${orderId}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a2e;">Estado de pedido actualizado</h1>
      <p>Tu pedido <strong>#${orderId}</strong> ha cambiado a:</p>
      <p style="font-size: 20px; font-weight: bold; color: #e94560;">${newStatus}</p>
      <a href="${process.env.FRONTEND_URL}/pedidos/${orderId}" style="display: inline-block; padding: 12px 24px; background: #e94560; color: white; text-decoration: none; border-radius: 6px;">Ver pedido</a>
    </div>
  `,
});
