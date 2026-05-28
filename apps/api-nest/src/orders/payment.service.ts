import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DiscountService } from '../cart/discount.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly discountService: DiscountService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createPaymentIntent(
    userId: string,
    options?: { receiptType?: 'boleta' | 'factura'; paymentMethod?: 'card' | 'debit' | 'yape' }
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { productVariant: { include: { product: true } } } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    let totalCents = 0;
    const quantityByProductId = cart.items.reduce<Record<string, number>>((acc, item) => {
      const productId = item.productVariant.productId;
      acc[productId] = (acc[productId] || 0) + item.quantity;
      return acc;
    }, {});

    for (const item of cart.items) {
      if (item.quantity > item.productVariant.stock) {
        throw new BadRequestException(`Stock insuficiente para ${item.productVariant.product.name}`);
      }

      const basePrice = item.productVariant.price ?? item.productVariant.product.basePrice;
      const productTotalQuantity = quantityByProductId[item.productVariant.productId] || item.quantity;
      
      const discountInfo = await this.discountService.calculateDiscount(
        productTotalQuantity,
        basePrice,
        item.productVariant.product.categoryId
      );

      totalCents += Math.round(discountInfo.finalPrice.toNumber() * 100) * item.quantity;
    }

    if (totalCents <= 0) {
      throw new BadRequestException('Monto total inválido');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
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
  }
}

