import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calculateDiscount } from '../services/discount.service';

export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { productVariant: { include: { product: true } } } } }
      });
    }

    // Apply dynamic discounts
    let totalCents = 0;
    const itemsWithDiscounts = await Promise.all(cart.items.map(async (item) => {
      const basePrice = item.productVariant.price || item.productVariant.product.basePrice;
      const discountInfo = await calculateDiscount(
        item.quantity, 
        basePrice, 
        item.productVariant.product.categoryId
      );

      const subtotalCents = Math.round(discountInfo.finalPrice.toNumber() * 100) * item.quantity;
      totalCents += subtotalCents;

      return {
        ...item,
        appliedDiscountPct: discountInfo.appliedPercentage,
        discountType: discountInfo.type,
        finalUnitPrice: discountInfo.finalPrice.toNumber(),
        subtotal: subtotalCents / 100
      };
    }));

    res.json({
      id: cart.id,
      userId: cart.userId,
      items: itemsWithDiscounts,
      totalAmount: totalCents / 100
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productVariantId, quantity } = req.body;

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productVariantId: {
          cartId: cart.id,
          productVariantId
        }
      }
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productVariantId, quantity }
      });
    }

    res.json({ message: 'Item added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity }
      });
    }

    res.json({ message: 'Cart item updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const emptyCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.json({ message: 'Cart emptied' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
