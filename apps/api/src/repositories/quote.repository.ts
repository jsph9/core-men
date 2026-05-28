import prisma from '../lib/prisma';
import { QuoteStatus } from '@coremen/types';

export class QuoteRepository {
  static async findManyByClientId(clientId: string) {
    return prisma.quote.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  static async create(clientId: string, data: {
    garmentType: string;
    fabricType: string;
    color: string;
    totalQuantity: number;
    designImageUrl?: string;
    designZone?: string;
    designX?: number;
    designY?: number;
    designScaleX?: number;
    designScaleY?: number;
    designRotation?: number;
    message?: string;
    items: Array<{ productVariantId: string; quantity: number }>;
  }) {
    return prisma.quote.create({
      data: {
        clientId,
        garmentType: data.garmentType,
        fabricType: data.fabricType,
        color: data.color,
        totalQuantity: data.totalQuantity,
        designImageUrl: data.designImageUrl,
        designZone: data.designZone,
        designX: data.designX,
        designY: data.designY,
        designScaleX: data.designScaleX,
        designScaleY: data.designScaleY,
        designRotation: data.designRotation,
        message: data.message,
        status: QuoteStatus.PENDING,
        items: {
          create: data.items.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          })),
        },
        statusHistory: {
          create: {
            toStatus: QuoteStatus.PENDING,
            changedBy: clientId,
            note: 'Cotización solicitada por el cliente',
          },
        },
      },
    });
  }

  static async findMany(status?: QuoteStatus) {
    return prisma.quote.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            productVariant: {
              include: { product: true, size: true },
            },
          },
        },
      },
    });
  }

  static async findById(id: string) {
    return prisma.quote.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
                size: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  static async updateStatus(id: string, data: {
    status: QuoteStatus;
    changedBy: string;
    note?: string;
    quotedPrice?: number;
    merchantMessage?: string;
    unfeasibleReason?: string;
    whatsappUrl?: string;
  }) {
    return prisma.quote.update({
      where: { id },
      data: {
        status: data.status,
        quotedPrice: data.quotedPrice !== undefined ? data.quotedPrice : undefined,
        merchantMessage: data.merchantMessage !== undefined ? data.merchantMessage : undefined,
        unfeasibleReason: data.unfeasibleReason !== undefined ? data.unfeasibleReason : undefined,
        whatsappUrl: data.whatsappUrl !== undefined ? data.whatsappUrl : undefined,
        statusHistory: {
          create: {
            toStatus: data.status,
            changedBy: data.changedBy,
            note: data.note,
          },
        },
      },
    });
  }
}
