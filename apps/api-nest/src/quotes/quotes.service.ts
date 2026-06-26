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

    // Actualización incremental dentro de una transacción
    await this.prisma.$transaction(async (tx) => {
      // --- Items: upsert por productVariantId ---
      if (data.items) {
        const existingItems = await tx.quoteItem.findMany({ where: { quoteId: id } });
        const existingMap = new Map(existingItems.map(i => [i.productVariantId, i]));
        const incomingVariantIds = new Set(data.items.map(i => i.productVariantId));

        for (const item of data.items) {
          const existing = existingMap.get(item.productVariantId);
          if (existing) {
            // Ya existe → actualizar cantidad solo si cambió
            if (existing.quantity !== item.quantity) {
              await tx.quoteItem.update({
                where: { id: existing.id },
                data: { quantity: item.quantity },
              });
            }
          } else {
            // Nuevo → crear
            await tx.quoteItem.create({
              data: {
                quoteId: id,
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              },
            });
          }
        }

        // Eliminar los que ya no están en la lista enviada
        const toDelete = existingItems.filter(i => !incomingVariantIds.has(i.productVariantId));
        if (toDelete.length > 0) {
          await tx.quoteItem.deleteMany({
            where: { id: { in: toDelete.map(i => i.id) } },
          });
        }

        // Recalcular cantidad total
        totalQuantity = data.items.reduce((acc, item) => acc + item.quantity, 0);
      }

      // --- Designs: upsert por placement ---
      if (data.designs) {
        const existingDesigns = await tx.design.findMany({ where: { quoteId: id } });
        const existingDesignMap = new Map(existingDesigns.map(d => [d.placement, d]));
        const incomingPlacements = new Set(data.designs.map(d => d.placement));

        for (const d of data.designs) {
          const existing = existingDesignMap.get(d.placement);
          if (existing) {
            // Ya existe → actualizar propiedades
            await tx.design.update({
              where: { id: existing.id },
              data: {
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
              },
            });
          } else {
            // Nuevo placement → crear
            await tx.design.create({
              data: {
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
              },
            });
          }
        }

        // Eliminar placements que ya no están
        const toDeleteDesigns = existingDesigns.filter(d => !incomingPlacements.has(d.placement));
        if (toDeleteDesigns.length > 0) {
          await tx.design.deleteMany({
            where: { id: { in: toDeleteDesigns.map(d => d.id) } },
          });
        }
      }
    });

    await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteMacroStatus.IN_REVIEW,
        customerResponseStatus: CustomerResponseStatus.UPDATED,
        customerPrice: data.quotedPrice,
        finalPrice: data.finalPrice || null,
        estimatedProductionTime: data.estimatedProductionTime || null,
        merchantMessage: data.merchantMessage,
        totalQuantity,
        statusHistory: {
          create: [
            {
              changedField: 'STATUS',
              oldValue: quote.status,
              newValue: 'IN_REVIEW',
              changedBy: merchantId,
              note: 'Comerciante actualizó cotización con nueva propuesta comercial',
            },
            {
              changedField: 'CUSTOMER_RESPONSE',
              oldValue: quote.customerResponseStatus,
              newValue: 'UPDATED',
              changedBy: merchantId,
              note: 'Propuesta comercial actualizada por el comerciante',
            }
          ],
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
        viabilityStatus: ViabilityStatus.NONVIABLE,
        unfeasibleReason: data.unfeasibleReason,
        whatsappUrl,
        statusHistory: {
          create: {
            changedField: 'VIABILITY',
            oldValue: quote.viabilityStatus,
            newValue: ViabilityStatus.NONVIABLE,
            changedBy: merchantId,
            note: `Motivo técnico: ${data.unfeasibleReason}`,
          },
        },
      },
    });

    return this.getMerchantQuoteById(id);
  }

  async startNegotiation(merchantId: string, id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('Cotización no encontrada');
    }

    await this.prisma.quote.update({
      where: { id },
      data: {
        customerResponseStatus: CustomerResponseStatus.IN_NEGOTIATION,
        statusHistory: {
          create: {
            changedField: 'CUSTOMER_RESPONSE',
            oldValue: quote.customerResponseStatus,
            newValue: CustomerResponseStatus.IN_NEGOTIATION,
            changedBy: merchantId,
            note: 'Se inició negociación externa por WhatsApp',
          },
        },
      },
    });

    return this.getMerchantQuoteById(id);
  }

  async acceptQuote(merchantId: string, id: string, data: RespondQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('Cotización no encontrada');
    }

    await this.prisma.quote.update({
      where: { id },
      data: {
        customerResponseStatus: CustomerResponseStatus.CONFIRMED,
        customerPrice: data.quotedPrice,
        finalPrice: data.finalPrice || null,
        estimatedProductionTime: data.estimatedProductionTime || null,
        merchantMessage: data.merchantMessage,
        statusHistory: {
          create: {
            changedField: 'CUSTOMER_RESPONSE',
            oldValue: quote.customerResponseStatus,
            newValue: CustomerResponseStatus.CONFIRMED,
            changedBy: merchantId,
            note: 'Cotización confirmada directamente por el comerciante.',
          },
        },
      },
    });

    return this.getMerchantQuoteById(id);
  }

  async rejectQuote(merchantId: string, id: string, rejectionReason: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('Cotización no encontrada');
    }

    await this.prisma.quote.update({
      where: { id },
      data: {
        customerResponseStatus: CustomerResponseStatus.REJECTED,
        status: QuoteMacroStatus.CANCELLED,
        rejectionReason: rejectionReason,
        statusHistory: {
          create: {
            changedField: 'CUSTOMER_RESPONSE',
            oldValue: quote.customerResponseStatus,
            newValue: CustomerResponseStatus.REJECTED,
            changedBy: merchantId,
            note: `Rechazado por el comerciante: ${rejectionReason}`,
          },
        },
      },
    });

    return this.getMerchantQuoteById(id);
  }
}
