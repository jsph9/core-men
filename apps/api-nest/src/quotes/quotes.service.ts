import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { QuoteStatus } from '@prisma/client';
import { CreateQuoteDto, RespondQuoteDto, MarkUnfeasibleDto } from './dto/quotes.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientQuotes(clientId: string) {
    return this.prisma.quote.findMany({
      where: { clientId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuote(clientId: string, data: CreateQuoteDto) {
    const { items, ...quoteData } = data;

    return this.prisma.quote.create({
      data: {
        ...quoteData,
        clientId,
        status: QuoteStatus.PENDING,
        items: items ? { create: items } : undefined,
        statusHistory: {
          create: {
            toStatus: QuoteStatus.PENDING,
            changedBy: clientId,
            note: 'Cotización creada',
          },
        },
      },
    });
  }

  async getMerchantQuotes(status?: QuoteStatus) {
    const where = status ? { status } : {};
    return this.prisma.quote.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMerchantQuoteById(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true } },
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!quote) throw new NotFoundException('Cotización no encontrada');
    return quote;
  }

  async respondToQuote(merchantId: string, id: string, data: RespondQuoteDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || (quote.status !== QuoteStatus.PENDING && quote.status !== QuoteStatus.UNFEASIBLE)) {
      throw new BadRequestException('Cotización no válida para ser respondida');
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.QUOTED,
        quotedPrice: data.quotedPrice,
        merchantMessage: data.merchantMessage,
        statusHistory: {
          create: {
            toStatus: QuoteStatus.QUOTED,
            changedBy: merchantId,
            note: 'Comerciante respondió con un precio',
          },
        },
      },
    });
  }

  async approveQuote(clientId: string, id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.clientId !== clientId || quote.status !== QuoteStatus.QUOTED) {
      throw new BadRequestException('Operación inválida');
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.APPROVED,
        statusHistory: {
          create: {
            toStatus: QuoteStatus.APPROVED,
            changedBy: clientId,
            note: 'Cliente aprobó la cotización',
          },
        },
      },
    });
  }

  async markUnfeasible(merchantId: string, id: string, data: MarkUnfeasibleDto) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote || quote.status !== QuoteStatus.PENDING) {
      throw new BadRequestException('Cotización no válida para ser marcada como inviable');
    }

    const merchant = await this.prisma.user.findUnique({ where: { id: merchantId } });
    const whatsappUrl = `https://wa.me/${merchant?.whatsappNumber || ''}?text=${encodeURIComponent(
      `Hola, me contacto por la cotización #${id} en CoreMen. ¿Podemos explorar alternativas?`
    )}`;

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.UNFEASIBLE,
        unfeasibleReason: data.unfeasibleReason,
        whatsappUrl,
        statusHistory: {
          create: {
            toStatus: QuoteStatus.UNFEASIBLE,
            changedBy: merchantId,
            note: 'Marcado inviable por el comerciante',
          },
        },
      },
    });
  }
}

