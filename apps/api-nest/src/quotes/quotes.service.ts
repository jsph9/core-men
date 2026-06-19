import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuoteMacroStatus, ViabilityStatus, FormalizationStatus } from '@prisma/client';
import { CreateQuoteDto, RespondQuoteDto, MarkUnfeasibleDto } from './dto/quotes.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientQuotes(clientId: string) {
    const quotes = await this.prisma.quote.findMany({
      where: { clientId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    fabric: true,
                  },
                },
                color: true,
              },
            },
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map((q) => {
      const firstItem = q.items[0];
      const garmentType = firstItem?.productVariant?.product?.name || 'Prenda';
      const fabricType = firstItem?.productVariant?.product?.fabric?.value || 'Estándar';
      const colorName = firstItem?.productVariant?.color?.name || 'Varios';

      return {
        ...q,
        garmentType,
        fabricType,
        color: colorName,
        items: q.items.map((item) => ({
          ...item,
          productVariant: {
            ...item.productVariant,
            color: item.productVariant?.color?.name || '',
          },
        })),
      };
    });
  }

  async createQuote(clientId: string, data: CreateQuoteDto) {
    const { items, message, totalQuantity, garmentType, fabricType, color, designImageUrl, designZone, designX, designY, designScaleX, designScaleY, designRotation } = data;

    // Encontrar una técnica por defecto si es que existe en la BD
    const firstTechnique = await this.prisma.technique.findFirst();
    const techniqueId = firstTechnique ? firstTechnique.id : 'default-technique-id';

    // Mapear diseño si se envió una imagen de diseño
    const designsData = designImageUrl ? {
      create: [{
        placement: (designZone?.toUpperCase() === 'BACK' ? 'BACK' : (designZone?.toUpperCase() === 'RIGHTSLEEVE' ? 'RIGHTSLEEVE' : (designZone?.toUpperCase() === 'LEFTSLEEVE' ? 'LEFTSLEEVE' : 'FRONT'))) as any,
        techniqueId,
        baseGarmentUrl: '/prenda-base.png',
        logoUrl: designImageUrl,
        positionX: designX || 0,
        positionY: designY || 0,
        width: designScaleX || 100,
        height: designScaleY || 100,
        rotation: designRotation || 0,
        canvasWidth: 500,
        canvasHeight: 500,
      }]
    } : undefined;

    const created = await this.prisma.quote.create({
      data: {
        clientId,
        totalQuantity: totalQuantity || 1,
        message: message || null,
        status: QuoteMacroStatus.PENDING,
        items: items ? { create: items } : undefined,
        designs: designsData,
        statusHistory: {
          create: {
            changedField: 'STATUS',
            oldValue: null,
            newValue: 'PENDING',
            changedBy: clientId,
            note: 'Cotización creada',
          },
        },
      },
    });

    return this.getMerchantQuoteById(created.id);
  }

  async getMerchantQuotes(status?: QuoteMacroStatus) {
    const where = status ? { status } : {};
    const quotes = await this.prisma.quote.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    fabric: true,
                  },
                },
                color: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map(q => {
      const { client, items, ...rest } = q;
      const name = `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Cliente General';
      
      const firstItem = items[0];
      const garmentType = firstItem?.productVariant?.product?.name || 'Prenda';
      const fabricType = firstItem?.productVariant?.product?.fabric?.value || 'Estándar';
      const colorName = firstItem?.productVariant?.color?.name || 'Varios';

      return {
        ...rest,
        client: {
          id: client?.id || '',
          name,
          email: client?.email || '',
        },
        garmentType,
        fabricType,
        color: colorName,
        items: items.map((item) => ({
          ...item,
          productVariant: {
            ...item.productVariant,
            color: item.productVariant?.color?.name || '',
          },
        })),
      };
    });
  }

  async getMerchantQuoteById(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    fabric: true,
                  },
                },
                color: true,
              },
            },
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!quote) throw new NotFoundException('Cotización no encontrada');
    
    const { client, items, ...rest } = quote;
    const name = `${client?.firstName || ''} ${client?.lastName || ''}`.trim() || 'Cliente General';

    const firstItem = items[0];
    const garmentType = firstItem?.productVariant?.product?.name || 'Prenda';
    const fabricType = firstItem?.productVariant?.product?.fabric?.value || 'Estándar';
    const colorName = firstItem?.productVariant?.color?.name || 'Varios';

    return {
      ...rest,
      client: {
        id: client?.id || '',
        name,
        email: client?.email || '',
      },
      garmentType,
      fabricType,
      color: colorName,
      items: items.map((item) => ({
        ...item,
        productVariant: {
          ...item.productVariant,
          color: item.productVariant?.color?.name || '',
        },
      })),
    };
  }

  async respondToQuote(merchantId: string, id: string, data: RespondQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || (quote.status !== QuoteMacroStatus.PENDING && quote.status !== QuoteMacroStatus.CANCELLED)) {
      throw new BadRequestException('Cotización no válida para ser respondida');
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteMacroStatus.IN_REVIEW,
        estimatedPrice: data.quotedPrice,
        merchantMessage: data.merchantMessage,
        statusHistory: {
          create: {
            changedField: 'STATUS',
            oldValue: quote.status,
            newValue: 'IN_REVIEW',
            changedBy: merchantId,
            note: 'Comerciante respondió con un precio',
          },
        },
      },
    });
  }

  async approveQuote(clientId: string, id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.clientId !== clientId || quote.status !== QuoteMacroStatus.IN_REVIEW) {
      throw new BadRequestException('Operación inválida');
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteMacroStatus.WAITING_PAYMENT,
        formalizationStatus: FormalizationStatus.CONFIRMED,
        statusHistory: {
          create: {
            changedField: 'STATUS',
            oldValue: quote.status,
            newValue: 'WAITING_PAYMENT',
            changedBy: clientId,
            note: 'Cliente aprobó la cotización',
          },
        },
      },
    });
  }

  async markUnfeasible(merchantId: string, id: string, data: MarkUnfeasibleDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.status !== QuoteMacroStatus.PENDING) {
      throw new BadRequestException('Cotización no válida para ser marcada como inviable');
    }

    const merchant = await this.prisma.user.findUnique({ where: { id: merchantId } });
    const whatsappUrl = `https://wa.me/${merchant?.whatsappNumber || ''}?text=${encodeURIComponent(
      `Hola, me contacto por la cotización #${id} en CoreMen. ¿Podemos explorar alternativas?`
    )}`;

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteMacroStatus.CANCELLED,
        viabilityStatus: ViabilityStatus.NONVIABLE,
        unfeasibleReason: data.unfeasibleReason,
        whatsappUrl,
        statusHistory: {
          create: {
            changedField: 'STATUS',
            oldValue: quote.status,
            newValue: 'CANCELLED',
            changedBy: merchantId,
            note: 'Marcado inviable por el comerciante',
          },
        },
      },
    });
  }
}

