import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CoreMen <noreply@coremen.pe>';

export const sendWelcomeEmail = async (to: string, name: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Bienvenido a CoreMen',
    html: `<h1>Hola ${name}!</h1><p>Tu cuenta en CoreMen ha sido creada exitosamente.</p>`,
  });
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Recupera tu contraseña - CoreMen',
    html: `<h1>Recuperar contraseña</h1><p>Usa este enlace para restablecer tu contraseña (expira en 30 minutos):</p><a href="${resetUrl}">${resetUrl}</a>`,
  });
};

export const sendOrderReceiptEmail = async (to: string, orderId: string, pdfBuffer?: Buffer) => {
  const attachments = pdfBuffer ? [{ filename: `comprobante-${orderId}.pdf`, content: pdfBuffer.toString('base64') }] : [];
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Comprobante de pago - Pedido #${orderId}`,
    html: `<h1>¡Gracias por tu compra!</h1><p>Tu pedido <strong>#${orderId}</strong> ha sido registrado con éxito.</p>`,
    attachments,
  });
};

export const sendQuoteResponseEmail = async (to: string, quoteId: string, merchantMessage: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Respuesta a tu cotización #${quoteId}`,
    html: `<h1>Cotización respondida</h1><p>El comerciante ha respondido tu cotización <strong>#${quoteId}</strong>:</p><blockquote>${merchantMessage}</blockquote>`,
  });
};

export const sendOrderStatusEmail = async (to: string, orderId: string, newStatus: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Actualización de pedido #${orderId}`,
    html: `<h1>Estado actualizado</h1><p>Tu pedido <strong>#${orderId}</strong> ha cambiado a: <strong>${newStatus}</strong></p>`,
  });
};

export const sendNewQuoteNotification = async (to: string, quoteId: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Nueva cotización recibida #${quoteId}`,
    html: `<h1>Nueva cotización</h1><p>Has recibido una nueva solicitud de cotización <strong>#${quoteId}</strong>. Revísala en tu panel.</p>`,
  });
};

export const sendAccountUnlockedEmail = async (to: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Cuenta desbloqueada - CoreMen',
    html: `<h1>Cuenta desbloqueada</h1><p>Tu cuenta ha sido desbloqueada por un administrador. Ya puedes iniciar sesión nuevamente.</p>`,
  });
};
