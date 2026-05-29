import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

interface DiscountResult {
  appliedPercentage: number;
  discountAmount: Decimal;
  finalPrice: Decimal;
  type: 'none' | 'volume' | 'season' | 'combined';
}

interface NextVolumeThreshold {
  minQuantity: number;
  percentage: number;
}

@Injectable()
export class DiscountService {
  constructor(private readonly prisma: PrismaService) {}

  async syncSeasonDiscountStatuses() {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.seasonDiscount.updateMany({
        where: {
          status: 'SCHEDULED',
          startDate: { lte: now },
          endDate: { gte: now },
        },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.seasonDiscount.updateMany({
        where: {
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          endDate: { lt: now },
        },
        data: { status: 'EXPIRED' },
      }),
    ]);
  }

  async calculateDiscount(
    quantity: number,
    basePriceStr: string | number | Prisma.Decimal,
    categoryId?: string
  ): Promise<DiscountResult> {
    await this.syncSeasonDiscountStatuses();
    const basePrice = new Decimal(basePriceStr as string | number);
    
    const volumeDiscount = await this.prisma.discountRule.findFirst({
      where: {
        isActive: true,
        minQuantity: { lte: quantity },
        OR: [
          { maxQuantity: null },
          { maxQuantity: { gte: quantity } }
        ]
      },
      orderBy: { percentage: 'desc' }
    });

    const now = new Date();
    const seasonDiscount = await this.prisma.seasonDiscount.findFirst({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { appliesTo: { isEmpty: true } },
          categoryId ? { appliesTo: { has: categoryId } } : { appliesTo: { isEmpty: true } }
        ]
      },
      orderBy: { percentage: 'desc' }
    });

    let appliedPercentage = new Decimal(0);
    let type: 'none' | 'volume' | 'season' | 'combined' = 'none';

    if (volumeDiscount && seasonDiscount) {
      const volPct = new Decimal(volumeDiscount.percentage as any);
      const seasPct = new Decimal(seasonDiscount.percentage as any);

      if (seasonDiscount.isAccumulative) {
        appliedPercentage = Decimal.min(volPct.plus(seasPct), new Decimal(100));
        type = 'combined';
      } else {
        appliedPercentage = Decimal.max(volPct, seasPct);
        type = volPct.gte(seasPct) ? 'volume' : 'season';
      }
    } else if (volumeDiscount) {
      appliedPercentage = new Decimal(volumeDiscount.percentage as any);
      type = 'volume';
    } else if (seasonDiscount) {
      appliedPercentage = new Decimal(seasonDiscount.percentage as any);
      type = 'season';
    }

    const discountAmount = basePrice.times(appliedPercentage).dividedBy(100);
    const finalPrice = basePrice.minus(discountAmount);

    return {
      appliedPercentage: appliedPercentage.toNumber(),
      discountAmount,
      finalPrice,
      type,
    };
  }

  async getNextVolumeThreshold(quantity: number): Promise<NextVolumeThreshold | null> {
    const nextRule = await this.prisma.discountRule.findFirst({
      where: {
        isActive: true,
        minQuantity: { gt: quantity },
      },
      orderBy: { minQuantity: 'asc' }
    });

    if (!nextRule) {
      return null;
    }

    return {
      minQuantity: nextRule.minQuantity,
      percentage: Number(nextRule.percentage),
    };
  }
}
