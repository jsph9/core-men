import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuoteMacroStatus, ViabilityStatus, ClientFormalizationStatus, CustomerResponseStatus } from '@prisma/client';
import { CreateQuoteDto, RespondQuoteDto, MarkUnfeasibleDto } from './dto/quotes.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientQuotes(clientId: string) {
    return this.prisma.quote.findMany({
      where: { clientId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    fabric: true,
                    category: true,
                  },
                },
                color: true,
                size: true,
              },
            },
          },
        },
        designs: {
          include: {
            technique: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuote(clientId: string, data: CreateQuoteDto) {
    const { items, message, totalQuantity, designs } = data;

    const created = await this.prisma.quote.create({
      data: {
        clientId,
        totalQuantity,
        message: message || null,
        status: QuoteMacroStatus.PENDING,
        items: {
          create: items.map(item => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          })),
        },
        designs: designs && designs.length > 0 ? {
          create: designs.map(d => ({
            placement: d.placement,
            techniqueId: d.techniqueId,
            baseGarmentUrl: d.baseGarmentUrl,
            logoUrl: d.logoUrl,
            positionX: d.positionX,
            positionY: d.positionY,
            width: d.width,
            height: d.height,
            rotation: d.rotation,
            canvasWidth: d.canvasWidth,
            canvasHeight: d.canvasHeight,
          })),
        } : undefined,
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
    return this.prisma.quote.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            maternalLastName: true,
            email: true,
            whatsappNumber: true,
            businessName: true,
            ruc: true,
          },
        },
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    fabric: true,
                    category: true,
                  },
                },
                color: true,
                size: true,
              },
            },
          },
        },
        designs: {
          include: {
            technique: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMerchantQuoteById(id: string, merchantId?: string): Promise<any> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            maternalLastName: true,
            email: true,
            whatsappNumber: true,
            businessName: true,
            ruc: true,
          },
        },
        items: {
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    fabric: true,
                    category: true,
                  },
                },
                color: true,
                size: true,
              },
            },
          },
        },
        designs: {
          include: {
            technique: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });

    if (!quote) throw new NotFoundException('Cotización no encontrada');

    if (quote.status === QuoteMacroStatus.PENDING && merchantId) {
      await this.prisma.quote.update({
        where: { id },
        data: {
          status: QuoteMacroStatus.IN_REVIEW,
          isVisited: true,
          statusHistory: {
            create: {
              changedField: 'STATUS',
              oldValue: QuoteMacroStatus.PENDING,
              newValue: QuoteMacroStatus.IN_REVIEW,
              changedBy: merchantId,
              note: '',
            },
          },
        },
      });

      // Recargar con los nuevos estados e historial
      return this.getMerchantQuoteById(id);
    }

    return quote;
  }

  async respondToQuote(merchantId: string, id: string, data: RespondQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || (quote.status !== QuoteMacroStatus.PENDING && quote.status !== QuoteMacroStatus.CANCELLED)) {
      throw new BadRequestException('Cotización no válida para ser respondida');
    }

    await this.prisma.quote.update({
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

    return this.getMerchantQuoteById(id);
  }

  async approveQuote(clientId: string, id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.clientId !== clientId || quote.status !== QuoteMacroStatus.IN_REVIEW) {
      throw new BadRequestException('Operación inválida');
    }

    await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteMacroStatus.WAITING_PAYMENT,
        clientFormalizationStatus: ClientFormalizationStatus.CONFIRMED,
        customerResponseStatus: CustomerResponseStatus.CONFIRMED,
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

    return this.getMerchantQuoteById(id);
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

    await this.prisma.quote.update({
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

    return this.getMerchantQuoteById(id);
  }
}
