import { Request, Response } from 'express';
import { stripe } from '../lib/stripe';
import prisma from '../lib/prisma';
import { OrderStatus } from '@coremen/types';
// import { sendOrderReceiptEmail } from '../services/email.service'; // Pending implementation

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

    try {
      // 1. Transaction to handle Order creation, Stock reduction, and Cart clearing
      await prisma.$transaction(async (tx) => {
        const cart = await tx.cart.findUnique({
          where: { id: cartId },
          include: { items: { include: { productVariant: true } } }
        });

        if (!cart) throw new Error('Cart not found during webhook execution');

        // Create Order
        const order = await tx.order.create({
          data: {
            userId,
            totalAmount: paymentIntent.amount / 100,
            status: OrderStatus.REGISTERED,
            payment: {
              create: {
                stripePaymentId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                status: 'confirmed',
                method: paymentIntent.payment_method_types[0] || 'card',
                paidAt: new Date()
              }
            },
            statusHistory: {
              create: {
                toStatus: OrderStatus.REGISTERED,
                changedBy: 'system',
                reason: 'Pago confirmado por Stripe'
              }
            },
            items: {
              create: cart.items.map(item => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                unitPrice: item.productVariant.price || 0, // In reality, we'd use the discount final price
                subtotal: 0 // To be accurate, we'd recompute or store the final price in the cart
              }))
            }
          }
        });

        // Reduce stock
        for (const item of cart.items) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { decrement: item.quantity } }
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        // 4 & 5. Generar PDF y enviar email (Simulado)
        // const user = await tx.user.findUnique({ where: { id: userId } });
        // await sendOrderReceiptEmail(user, order);
        console.log(`Order ${order.id} processed successfully`);
      });

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
