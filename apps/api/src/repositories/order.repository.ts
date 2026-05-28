import prisma from '../lib/prisma';
import { OrderStatus } from '@coremen/types';

export class OrderRepository {
  static async findManyByUserId(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
  }

  static async findByIdWithDetails(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { productVariant: { include: { product: true } } } },
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  static async updateStatus(id: string, status: OrderStatus, fromStatus: string, userId: string, reason?: string) {
    return prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            fromStatus: fromStatus as any,
            toStatus: status as any,
            changedBy: userId,
            reason,
          },
        },
      },
    });
  }

  static async findByIdWithReceiptDetails(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: { include: { productVariant: { include: { product: true, size: true } } } },
        payment: true,
      },
    });
  }

  static async findPaymentByStripeId(stripePaymentId: string) {
    return prisma.payment.findUnique({
      where: { stripePaymentId },
    });
  }
}
