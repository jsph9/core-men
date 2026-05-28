import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DiscountService } from './discount.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discountService: DiscountService,
  ) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
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
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { productVariant: { include: { product: true, size: true } } } } },
      });
    }

    const quantityByProductId = cart.items.reduce<Record<string, number>>((acc, item) => {
      const productId = item.productVariant.productId;
      acc[productId] = (acc[productId] || 0) + item.quantity;
      return acc;
    }, {});

    let totalCents = 0;
    const itemsWithDiscounts = await Promise.all(
      cart.items.map(async (item) => {
        const basePrice = item.productVariant.price ?? item.productVariant.product.basePrice;
        const productTotalQuantity = quantityByProductId[item.productVariant.productId] || item.quantity;
        
        const discountInfo = await this.discountService.calculateDiscount(
          productTotalQuantity,
          basePrice,
          item.productVariant.product.categoryId
        );

        const nextThreshold = await this.discountService.getNextVolumeThreshold(productTotalQuantity);

        const subtotalCents = Math.round(discountInfo.finalPrice.toNumber() * 100) * item.quantity;
        const originalSubtotalCents = Math.round(Number(basePrice) * 100) * item.quantity;
        totalCents += subtotalCents;

        return {
          id: item.id,
          cartId: item.cartId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          productVariant: item.productVariant,
          appliedDiscountPct: discountInfo.appliedPercentage,
          discountType: discountInfo.type,
          originalUnitPrice: Number(basePrice),
          finalUnitPrice: discountInfo.finalPrice.toNumber(),
          savingsAmount: (originalSubtotalCents - subtotalCents) / 100,
          thresholdHint: nextThreshold
            ? {
                missingUnits: Math.max(nextThreshold.minQuantity - productTotalQuantity, 0),
                targetPercentage: nextThreshold.percentage,
              }
            : null,
          subtotal: subtotalCents / 100,
        };
      })
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items: itemsWithDiscounts,
      totalAmount: totalCents / 100,
    };
  }

  async addToCart(userId: string, data: AddToCartDto) {
    const { productVariantId, quantity } = data;

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: true },
    });

    if (!variant || !variant.isActive || !variant.product.isActive) {
      throw new NotFoundException('Variante no encontrada o inactiva');
    }

    if (variant.stock < quantity) {
      throw new BadRequestException(`Stock insuficiente. Stock actual: ${variant.stock}`);
    }

    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productVariantId: { cartId: cart.id, productVariantId } },
    });

    if (existingItem) {
      const requestedQty = existingItem.quantity + quantity;
      if (requestedQty > variant.stock) {
        throw new BadRequestException(`Stock insuficiente. Stock actual: ${variant.stock}`);
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: requestedQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productVariantId, quantity },
      });
    }

    return this.getCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, data: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { productVariant: true, cart: true },
    });

    if (!cartItem) throw new NotFoundException('Ítem no encontrado');
    if (cartItem.cart.userId !== userId) throw new UnauthorizedException();

    if (data.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      if (data.quantity > cartItem.productVariant.stock) {
        throw new BadRequestException(`Stock insuficiente. Stock actual: ${cartItem.productVariant.stock}`);
      }
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: data.quantity },
      });
    }

    return this.getCart(userId);
  }

  async removeCartItem(userId: string, itemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) throw new NotFoundException('Ítem no encontrado');
    if (cartItem.cart.userId !== userId) throw new UnauthorizedException();

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  async emptyCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}

