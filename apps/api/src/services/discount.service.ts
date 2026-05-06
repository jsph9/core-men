import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

interface DiscountResult {
  appliedPercentage: number;
  discountAmount: Decimal;
  finalPrice: Decimal;
  type: 'none' | 'volume' | 'season' | 'combined';
}

/**
 * Motor de Descuentos (Discount Engine)
 * Calcula el mejor descuento aplicable para una cantidad y un precio base.
 * RNF-10: Uso de Decimal.js para precisión fija.
 */
export const calculateDiscount = async (
  quantity: number,
  basePriceStr: string | number | Prisma.Decimal,
  categoryId?: string
): Promise<DiscountResult> => {
  const basePrice = new Decimal(basePriceStr as string | number);
  
  // 1. Obtener descuento por volumen aplicable
  const volumeDiscount = await prisma.discountRule.findFirst({
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

  // 2. Obtener descuento de temporada aplicable
  const now = new Date();
  const seasonDiscount = await prisma.seasonDiscount.findFirst({
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

  // Cálculos precisos
  const discountAmount = basePrice.times(appliedPercentage).dividedBy(100);
  const finalPrice = basePrice.minus(discountAmount);

  return {
    appliedPercentage: appliedPercentage.toNumber(),
    discountAmount,
    finalPrice,
    type,
  };
};
