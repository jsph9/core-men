import { CartRepository } from '../repositories/cart.repository';
import { stripe } from '../lib/stripe';
import { calculateDiscount } from './discount.service';

/**
 * Crea un PaymentIntent de Stripe a partir del carrito del usuario.
 * El monto se calcula 100% en el servidor para evitar manipulación.
 */
export const createPaymentIntent = async (
  userId: string,
  options?: { receiptType?: 'boleta' | 'factura'; paymentMethod?: 'card' | 'debit' | 'yape' }
) => {
  const cart = await CartRepository.findByUserId(userId);

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  let totalCents = 0;
  const quantityByProductId = cart.items.reduce<Record<string, number>>((acc, item) => {
    const productId = item.productVariant.productId;
    acc[productId] = (acc[productId] || 0) + item.quantity;
    return acc;
  }, {});

  for (const item of cart.items) {
    if (item.quantity > item.productVariant.stock) {
      throw new Error(`Stock insuficiente para ${item.productVariant.product.name}`);
    }

    const basePrice = item.productVariant.price || item.productVariant.product.basePrice;
    const productTotalQuantity = quantityByProductId[item.productVariant.productId] || item.quantity;
    const discountInfo = await calculateDiscount(
      productTotalQuantity,
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
    metadata: {
      cartId: cart.id,
      userId,
      receiptType: options?.receiptType || 'boleta',
      preferredPaymentMethod: options?.paymentMethod || 'card',
    },
  });

  return { clientSecret: paymentIntent.client_secret };
};
