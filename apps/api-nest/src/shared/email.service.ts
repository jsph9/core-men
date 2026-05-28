import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_mock');
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'CoreMen <noreply@coremen.pe>';
  }

  async sendWelcomeEmail(to: string, name: string) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Bienvenido a CoreMen',
        html: `<h1>Hola ${name}!</h1><p>Tu cuenta en CoreMen ha sido creada exitosamente.</p>`,
      });
    } catch (error) {
      this.logger.error(`Error sending welcome email to ${to}: ${error}`);
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Recupera tu contraseña - CoreMen',
        html: `<h1>Recuperar contraseña</h1><p>Usa este enlace para restablecer tu contraseña (expira en 30 minutos):</p><a href="${resetUrl}">${resetUrl}</a>`,
      });
    } catch (error) {
      this.logger.error(`Error sending password reset email to ${to}: ${error}`);
    }
  }

  async sendOrderReceiptEmail(to: string, orderId: string, pdfBuffer?: Buffer) {
    try {
      const attachments = pdfBuffer ? [{ filename: `comprobante-${orderId}.pdf`, content: pdfBuffer.toString('base64') }] : [];
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Comprobante de pago - Pedido #${orderId}`,
        html: `<h1>¡Gracias por tu compra!</h1><p>Tu pedido <strong>#${orderId}</strong> ha sido registrado con éxito.</p>`,
        attachments,
      });
    } catch (error) {
      this.logger.error(`Error sending order receipt email for order ${orderId}: ${error}`);
    }
  }

  async sendQuoteResponseEmail(to: string, quoteId: string, merchantMessage: string) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Respuesta a tu cotización #${quoteId}`,
        html: `<h1>Cotización respondida</h1><p>El comerciante ha respondido tu cotización <strong>#${quoteId}</strong>:</p><blockquote>${merchantMessage}</blockquote>`,
      });
    } catch (error) {
      this.logger.error(`Error sending quote response email for quote ${quoteId}: ${error}`);
    }
  }

  async sendOrderStatusEmail(to: string, orderId: string, newStatus: string) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Actualización de pedido #${orderId}`,
        html: `<h1>Estado actualizado</h1><p>Tu pedido <strong>#${orderId}</strong> ha cambiado a: <strong>${newStatus}</strong></p>`,
      });
    } catch (error) {
      this.logger.error(`Error sending order status email for order ${orderId}: ${error}`);
    }
  }

  async sendNewQuoteNotification(to: string, quoteId: string) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: `Nueva cotización recibida #${quoteId}`,
        html: `<h1>Nueva cotización</h1><p>Has recibido una nueva solicitud de cotización <strong>#${quoteId}</strong>. Revísala en tu panel.</p>`,
      });
    } catch (error) {
      this.logger.error(`Error sending new quote notification for quote ${quoteId}: ${error}`);
    }
  }

  async sendAccountUnlockedEmail(to: string) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Cuenta desbloqueada - CoreMen',
        html: `<h1>Cuenta desbloqueada</h1><p>Tu cuenta ha sido desbloqueada por un administrador. Ya puedes iniciar sesión nuevamente.</p>`,
      });
    } catch (error) {
      this.logger.error(`Error sending account unlocked email to ${to}: ${error}`);
    }
  }
}

