import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateMerchantProfileDto } from './dto/merchant.dto';

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
}

