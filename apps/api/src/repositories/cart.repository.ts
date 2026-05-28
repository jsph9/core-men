import prisma from '../lib/prisma';

export class CartRepository {
  static async findByUserId(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true, size: true },
            },
          },
        },
      },
    });
  }

  static async create(userId: string) {
    return prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true, size: true },
            },
          },
        },
      },
    });
  }

  static async findVariantById(variantId: string) {
    return prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
  }

  static async findItemByCartAndVariant(cartId: string, variantId: string) {
    return prisma.cartItem.findFirst({
      where: { cartId, productVariantId: variantId },
    });
  }

  static async createItem(cartId: string, variantId: string, quantity: number) {
    return prisma.cartItem.create({
      data: { cartId, productVariantId: variantId, quantity },
    });
  }

  static async updateItemQuantity(itemId: string, quantity: number) {
    return prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  static async findItemById(itemId: string) {
    return prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        productVariant: {
          include: { product: true },
        },
      },
    });
  }

  static async deleteItem(itemId: string) {
    return prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  static async emptyCart(cartId: string) {
    return prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }
}
