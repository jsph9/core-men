import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateMerchantProfileDto } from './dto/merchant.dto';
import { QuoteMacroStatus } from '@prisma/client'; // <-- Agrega esta importación

@Injectable()
export class MerchantService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMerchantProfile(merchantId: string, data: UpdateMerchantProfileDto) {
    const merchant = await this.prisma.user.findUnique({ where: { id: merchantId } });
    
    if (!merchant) {
      throw new NotFoundException('Comerciante no encontrado');
    }

    return this.prisma.user.update({
      where: { id: merchantId },
      data,
    });
  }

  // NUEVA FUNCIÓN: Actualiza el estado y crea el historial
  async updateOrderStatus(merchantId: string, quoteId: string, status: QuoteMacroStatus) {
    // Validamos que la cotización exista (opcionalmente podrías validar que pertenezca a este merchant)
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId }
    });

    if (!quote) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: status,
        statusHistory: {
          create: {
            changedField: 'STATUS',
            newValue: status,
            changedBy: merchantId, // Registramos qué usuario hizo el cambio
          }
        }
      }
    });
  }
}