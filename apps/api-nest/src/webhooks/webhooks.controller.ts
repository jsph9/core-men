import { Controller, Post, Req, Res, Headers, BadRequestException, HttpStatus } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../shared/email.service';
import { PdfService } from '../shared/pdf.service';
import Stripe from 'stripe';
import type { Response } from 'express';

@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2025-02-24.acacia',
    });
  }

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: any,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    if (process.env.NODE_ENV === 'development' && signature === 'mock-stripe-signature') {
      // Dev-only bypass to facilitate local payment simulations
      try {
        const bodyStr = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
        event = JSON.parse(bodyStr) as Stripe.Event;
        console.log('[NestJS Webhooks] Simulated mock Stripe webhook event received.');
      } catch (err: any) {
        return res.status(HttpStatus.BAD_REQUEST).send(`JSON parse error for mock body: ${err.message}`);
      }
    } else {
      try {
        event = this.stripe.webhooks.constructEvent(
          req.rawBody,
          signature,
          endpointSecret || '',
        );
      } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;
      const { cartId, userId } = metadata;
      const receiptType = metadata.receiptType === 'factura' ? 'factura' : 'boleta';
      const preferredPaymentMethod = metadata.preferredPaymentMethod || 'card';

      try {
        const existingPayment = await this.prisma.payment.findUnique({
          where: { stripePaymentId: paymentIntent.id },
        });

        if (existingPayment) {
          return res.json({ received: true });
        }

        const order = await this.ordersService.createOrderFromCart(
          cartId,
          userId,
          receiptType,
          preferredPaymentMethod,
          paymentIntent.id,
          paymentIntent.amount / 100,
          paymentIntent.currency,
        );

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          const receiptPdf = await this.pdfService.generateOrderReceipt(order);
          await this.emailService.sendOrderReceiptEmail(user.email, order.id, receiptPdf);
        }

        console.log(`Order ${order.id} processed successfully via NestJS Webhook`);
      } catch (error) {
        console.error('Error processing payment_intent.succeeded:', error);
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error(`Payment failed: ${paymentIntent.last_payment_error?.message}`);
    }

    return res.status(HttpStatus.OK).json({ received: true });
  }
}
