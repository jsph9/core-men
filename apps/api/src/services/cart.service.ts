import { CartRepository } from '../repositories/cart.repository';
import { calculateDiscount, getNextVolumeThreshold } from './discount.service';

export class CartService {
  static async getCart(userId: string) {
    let cart = await CartRepository.findByUserId(userId);

    if (!cart) {
      cart = await CartRepository.create(userId);
    }

    const quantityByProductId = cart.items.reduce<Record<string, number>>((acc, item) => {
      const productId = item.productVariant.productId;
      acc[productId] = (acc[productId] || 0) + item.quantity;
      return acc;
    }, {});

    let totalCents = 0;
    const itemsWithDiscounts = await Promise.all(
      cart.items.map(async (item) => {
        const basePrice = item.productVariant.price || item.productVariant.product.basePrice;
        const productTotalQuantity = quantityByProductId[item.productVariant.productId] || item.quantity;
        
        const discountInfo = await calculateDiscount(
          productTotalQuantity,
          basePrice,
          item.productVariant.product.categoryId
        );

        const nextThreshold = await getNextVolumeThreshold(productTotalQuantity);

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

  static async addToCart(userId: string, productVariantId: string, quantity: number) {
    if (quantity <= 0) {
      throw new Error('Cantidad invalida');
    }

    const variant = await CartRepository.findVariantById(productVariantId);
    if (!variant || !variant.isActive || !variant.product.isActive) {
      throw new Error('VARIANT_NOT_FOUND');
    }

    if (variant.stock <= 0) {
      throw { name: 'InsufficientStockError', stock: variant.stock };
    }

    let cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      cart = await CartRepository.create(userId);
    }

    // Check if variant already in cart
    const existingItem = await prismaItemCheck(cart.id, productVariantId);

    if (existingItem) {
      const requestedQty = existingItem.quantity + quantity;
      if (requestedQty > variant.stock) {
        throw { name: 'InsufficientStockError', stock: variant.stock };
      }

      await CartRepository.updateItemQuantity(existingItem.id, requestedQty);
    } else {
      if (quantity > variant.stock) {
        throw { name: 'InsufficientStockError', stock: variant.stock };
      }

      await CartRepository.createItem(cart.id, productVariantId, quantity);
    }
  }

  static async updateCartItem(userId: string, itemId: string, quantity: number) {
    const cartItem = await CartRepository.findItemById(itemId);
    if (!cartItem) {
      throw new Error('ITEM_NOT_FOUND');
    }

    // Ensure item belongs to user
    const cart = await CartRepository.findByUserId(userId);
    if (!cart || cartItem.productVariant.productId === undefined) { // basic security check
      // Wait, let's verify if cartItem belongs to user's cart
      // cartItem has cartId, cart has id.
    }
    if (cartItem.cartId !== cart?.id) {
      throw new Error('UNAUTHORIZED');
    }

    if (quantity <= 0) {
      await CartRepository.deleteItem(itemId);
    } else {
      if (quantity > cartItem.productVariant.stock) {
        throw { name: 'InsufficientStockError', stock: cartItem.productVariant.stock };
      }

      await CartRepository.updateItemQuantity(itemId, quantity);
    }
  }

  static async removeCartItem(userId: string, itemId: string) {
    const cartItem = await CartRepository.findItemById(itemId);
    if (!cartItem) {
      throw new Error('ITEM_NOT_FOUND');
    }

    const cart = await CartRepository.findByUserId(userId);
    if (!cart || cartItem.cartId !== cart.id) {
      throw new Error('UNAUTHORIZED');
    }

    await CartRepository.deleteItem(itemId);
  }

  static async emptyCart(userId: string) {
    const cart = await CartRepository.findByUserId(userId);
    if (cart) {
      await CartRepository.emptyCart(cart.id);
    }
  }
}

// Inline helper to avoid compound index imports in repository if they differ
import prisma from '../lib/prisma';
async function prismaItemCheck(cartId: string, productVariantId: string) {
  return prisma.cartItem.findUnique({
    where: {
      cartId_productVariantId: {
        cartId,
        productVariantId,
      },
    },
  });
}
