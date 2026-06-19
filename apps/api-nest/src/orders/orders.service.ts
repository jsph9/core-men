import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DiscountService } from '../cart/discount.service';
import { EmailService } from '../shared/email.service';
import { PdfService } from '../shared/pdf.service';
import { OrderStatus, ReceiptType, PaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discountService: DiscountService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  async createOrderFromCart(
    cartId: string,
    userId: string,
    receiptType: 'boleta' | 'factura',
    preferredPaymentMethod: string,
    paymentIntentId: string,
    paymentAmount: number,
    paymentCurrency: string
  ) {
    return this.prisma.$transaction(async (tx) => {
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
        const discountInfo = await this.discountService.calculateDiscount(productTotalQty, unitBase, item.productVariant.product.categoryId);
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

      const receiptTypeEnum = receiptType === 'factura' ? ReceiptType.FACTURA : ReceiptType.BOLETA;
      const paymentMethodEnum = preferredPaymentMethod?.toUpperCase() === 'YAPE' ? PaymentMethod.YAPE : PaymentMethod.CARD;

      // Create Order
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          receiptType: receiptTypeEnum,
          status: OrderStatus.REGISTERED,
          payment: {
            create: {
              stripePaymentId: paymentIntentId,
              amount: paymentAmount,
              currency: paymentCurrency.toUpperCase(),
              status: PaymentStatus.CONFIRMED,
              method: paymentMethodEnum,
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

  async getClientOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true, size: true, color: true },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeStatuses: OrderStatus[] = [OrderStatus.REGISTERED, OrderStatus.IN_PREPARATION, OrderStatus.READY_FOR_PICKUP];
    
    const sorted = orders.sort((a, b) => {
      const aIsActive = activeStatuses.includes(a.status);
      const bIsActive = activeStatuses.includes(b.status);
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return sorted;
  }

  async getMerchantOrders() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.REGISTERED, OrderStatus.IN_PREPARATION, OrderStatus.READY_FOR_PICKUP]
        }
      },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true, size: true, color: true }
            }
          }
        },
        payment: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return orders.map(order => {
      const { user, items, ...rest } = order;
      const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Cliente General';
      return {
        ...rest,
        user: {
          name,
          email: user?.email || ''
        },
        items,
      };
    });
  }

  async getOrderDetails(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { productVariant: { include: { product: true, size: true, color: true } } } },
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order || order.userId !== userId) {
      throw new BadRequestException('Pedido no encontrado');
    }

    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, merchantId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, user: true },
    });
    
    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }

    if (status === OrderStatus.IN_PREPARATION && order.payment?.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException('No se puede avanzar a preparación sin pago confirmado');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: status,
            changedBy: merchantId,
            reason: reason || 'Actualizado por comerciante',
          },
        },
      },
      include: { user: true }
    });

    if (updated.user?.email) {
      await this.emailService.sendOrderStatusEmail(updated.user.email, orderId, status);
    }

    return updated;
  }

  async getOrderReceiptData(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { productVariant: { include: { product: true, size: true } } } },
        payment: true,
      },
    });

    if (!order || order.userId !== userId) {
      throw new BadRequestException('Pedido no encontrado');
    }

    const pdfBuffer = await this.pdfService.generateOrderReceipt(order);
    const receiptType = (order.receiptType || 'BOLETA').toLowerCase();

    return {
      pdfBuffer,
      filename: `${receiptType}-${order.id}.pdf`
    };
  }
}
