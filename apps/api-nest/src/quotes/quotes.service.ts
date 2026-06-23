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

    let estimatedPrice = 0;
    for (const item of items) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.productVariantId },
        include: {
          product: {
            include: {
              fabric: true,
            },
          },
        },
      });
      if (variant) {
        let unitPrice = Number(variant.price || variant.product.basePrice);
        if (variant.product.fabric) {
          unitPrice += Number(variant.product.fabric.price || 0);
        }
        if (designs && designs.length > 0) {
          for (const d of designs) {
            const p2t = await this.prisma.productToTechnique.findUnique({
              where: {
                productId_techniqueId: {
                  productId: variant.productId,
                  techniqueId: d.techniqueId,
                },
              },
            });
            if (p2t && p2t.specificPrice) {
              unitPrice += Number(p2t.specificPrice);
            }
          }
        }
        estimatedPrice += unitPrice * item.quantity;
      }
    }

    const created = await this.prisma.quote.create({
      data: {
        clientId,
        totalQuantity,
        message: message || null,
        status: QuoteMacroStatus.PENDING,
        estimatedPrice,
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
                    images: true,
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

    const discountRules = await this.prisma.discountRule.findMany({
      where: { isActive: true }
    });
    
    const seasonDiscounts = await this.prisma.seasonDiscount.findMany({
      where: { status: 'ACTIVE' }
    });

    return {
      ...quote,
      availableDiscounts: {
        discountRules,
        seasonDiscounts
      }
    };
  }

  async respondToQuote(merchantId: string, id: string, data: RespondQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (
      !quote || 
      (quote.status !== QuoteMacroStatus.PENDING && 
       quote.status !== QuoteMacroStatus.CANCELLED && 
       quote.status !== QuoteMacroStatus.IN_REVIEW)
    ) {
      throw new BadRequestException('Cotización no válida para ser respondida');
    }

    let totalQuantity = quote.totalQuantity;

    // Actualizamos items y diseños dentro de una transacción
    await this.prisma.$transaction(async (tx) => {
      if (data.items) {
        // Borrar items existentes
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });

        // Crear nuevos items
        if (data.items.length > 0) {
          await tx.quoteItem.createMany({
            data: data.items.map((item) => ({
              quoteId: id,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
            })),
          });
        }

        // Recalcular cantidad total
        totalQuantity = data.items.reduce((acc, item) => acc + item.quantity, 0);
      }

      if (data.designs) {
        // Borrar diseños existentes
        await tx.design.deleteMany({ where: { quoteId: id } });

        // Crear nuevos diseños
        if (data.designs.length > 0) {
          await tx.design.createMany({
            data: data.designs.map((d) => ({
              quoteId: id,
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
          });
        }
      }
    });

    await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteMacroStatus.IN_REVIEW,
        customerPrice: data.quotedPrice,
        finalPrice: data.finalPrice || null,
        estimatedProductionTime: data.estimatedProductionTime || null,
        merchantMessage: data.merchantMessage,
        totalQuantity,
        statusHistory: {
          create: {
            changedField: 'STATUS',
            oldValue: quote.status,
            newValue: 'IN_REVIEW',
            changedBy: merchantId,
            note: 'Comerciante respondió y actualizó cotización con precio',
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
        finalPrice: quote.customerPrice || quote.estimatedPrice,
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

  async markViable(merchantId: string, id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || (quote.status !== QuoteMacroStatus.PENDING && quote.status !== QuoteMacroStatus.IN_REVIEW)) {
      throw new BadRequestException('Cotización no válida para ser marcada como viable');
    }

    await this.prisma.quote.update({
      where: { id },
      data: {
        viabilityStatus: ViabilityStatus.VIABLE,
        statusHistory: {
          create: {
            changedField: 'VIABILITY',
            oldValue: quote.viabilityStatus,
            newValue: ViabilityStatus.VIABLE,
            changedBy: merchantId,
            note: 'Diseño marcado como viable por el comerciante',
          },
        },
      },
    });

    return this.getMerchantQuoteById(id);
  }

  async markUnfeasible(merchantId: string, id: string, data: MarkUnfeasibleDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || (quote.status !== QuoteMacroStatus.PENDING && quote.status !== QuoteMacroStatus.IN_REVIEW)) {
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
          create: [
            {
              changedField: 'STATUS',
              oldValue: quote.status,
              newValue: 'CANCELLED',
              changedBy: merchantId,
              note: 'Marcado inviable por el comerciante',
            },
            {
              changedField: 'VIABILITY',
              oldValue: quote.viabilityStatus,
              newValue: ViabilityStatus.NONVIABLE,
              changedBy: merchantId,
              note: `Motivo técnico: ${data.unfeasibleReason}`,
            }
          ],
        },
      },
    });

    return this.getMerchantQuoteById(id);
  }
}
