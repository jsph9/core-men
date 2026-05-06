import prisma from '../lib/prisma';
import { stripe } from '../lib/stripe';
import { calculateDiscount } from './discount.service';

/**
 * Crea un PaymentIntent de Stripe a partir del carrito del usuario.
 * El monto se calcula 100% en el servidor para evitar manipulación.
 */
export const createPaymentIntent = async (userId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          productVariant: { include: { product: true } }
        }
      }
    }
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  let totalCents = 0;

  for (const item of cart.items) {
    const basePrice = item.productVariant.price || item.productVariant.product.basePrice;
    const discountInfo = await calculateDiscount(
      item.quantity,
      basePrice,
      item.productVariant.product.categoryId
    );
    totalCents += Math.round(discountInfo.finalPrice.toNumber() * 100) * item.quantity;
  }

  if (totalCents <= 0) {
    throw new Error('Invalid total amount');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: 'pen',
    payment_method_types: ['card'],
    metadata: { cartId: cart.id, userId },
  });

  return { clientSecret: paymentIntent.client_secret };
};
