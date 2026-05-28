import prisma from '../lib/prisma';
import { OrderStatus } from '@coremen/types';
import { calculateDiscount } from './discount.service';

export class OrderService {
  static async createOrderFromCart(
    cartId: string,
    userId: string,
    receiptType: 'boleta' | 'factura',
    preferredPaymentMethod: string,
    paymentIntentId: string,
    paymentAmount: number,
    paymentCurrency: string
  ) {
    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { id: cartId },
        include: { items: { include: { productVariant: { include: { product: true } } } } }
      });

      if (!cart) throw new Error('Cart not found during webhook execution');

      const quantityByProductId = cart.items.reduce<Record<string, number>>((acc, item) => {
        acc[item.productVariant.productId] = (acc[item.productVariant.productId] || 0) + item.quantity;
        return acc;
      }, {});

      for (const item of cart.items) {
        if (item.quantity > item.productVariant.stock) {
          throw new Error(`Stock insuficiente para variante ${item.productVariantId}`);
        }
      }

      const itemsToCreate = await Promise.all(cart.items.map(async (item) => {
        const unitBase = item.productVariant.price || item.productVariant.product.basePrice;
        const productTotalQty = quantityByProductId[item.productVariant.productId] || item.quantity;
        const discountInfo = await calculateDiscount(productTotalQty, unitBase, item.productVariant.product.categoryId);
        const unitPrice = discountInfo.finalPrice.toNumber();
        return {
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice,
          discountPct: discountInfo.appliedPercentage,
          subtotal: unitPrice * item.quantity,
        };
      }));

      const totalAmount = itemsToCreate.reduce((acc, item) => acc + item.subtotal, 0);

      // Create Order
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          receiptType,
          status: OrderStatus.REGISTERED,
          payment: {
            create: {
              stripePaymentId: paymentIntentId,
              amount: paymentAmount,
              currency: paymentCurrency.toUpperCase(),
              status: 'confirmed',
              method: preferredPaymentMethod,
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
            create: itemsToCreate
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

      return order;
    });
  }
}
