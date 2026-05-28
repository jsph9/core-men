import { Request, Response } from 'express';
import { stripe } from '../lib/stripe';
import { OrderService } from '../services/order.service';
import { UserRepository } from '../repositories/user.repository';
import { OrderRepository } from '../repositories/order.repository';
import { generateOrderReceipt } from '../services/pdf.service';
import { sendOrderReceiptEmail } from '../services/email.service';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // Requires raw body (handled in route setup)
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret as string);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any;
    const { cartId, userId } = paymentIntent.metadata;
    const receiptType = paymentIntent.metadata?.receiptType === 'factura' ? 'factura' : 'boleta';
    const preferredPaymentMethod = paymentIntent.metadata?.preferredPaymentMethod || 'card';

    try {
      const existingPayment = await OrderRepository.findPaymentByStripeId(paymentIntent.id);
      if (existingPayment) {
        return res.json({ received: true });
      }

      // Orquestación a través del servicio OrderService (capa de lógica de negocio)
      const order = await OrderService.createOrderFromCart(
        cartId,
        userId,
        receiptType,
        preferredPaymentMethod,
        paymentIntent.id,
        paymentIntent.amount / 100,
        paymentIntent.currency
      );

      const user = await UserRepository.findById(userId);
      if (user) {
        const receiptPdf = await generateOrderReceipt(order);
        await sendOrderReceiptEmail(user.email, order.id, receiptPdf);
      }

      console.log(`Order ${order.id} processed successfully`);

    } catch (error) {
      console.error('Error processing payment_intent.succeeded:', error);
      // Here we would ideally log to ErrorLog
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as any;
    console.error(`Payment failed: ${paymentIntent.last_payment_error?.message}`);
    // Log to ErrorLog in BD
  }

  // Return a 200 res to acknowledge receipt of the event
  res.send();
};
