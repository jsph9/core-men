import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';

const mapStockError = (available: number) => ({
  error: `Stock insuficiente. Disponible: ${available}`,
  code: 'INSUFFICIENT_STOCK',
  available,
});

export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await CartService.getCart(userId);
    res.json(result);
  } catch (error: any) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productVariantId, quantity } = req.body;

    await CartService.addToCart(userId, productVariantId, quantity);
    res.json({ message: 'Item added to cart' });
  } catch (error: any) {
    console.error('Add to cart error:', error);
    if (error.name === 'InsufficientStockError') {
      return res.status(409).json(mapStockError(error.stock));
    }
    if (error.message === 'VARIANT_NOT_FOUND') {
      return res.status(404).json({ error: 'Variante no disponible' });
    }
    if (error.message === 'Cantidad invalida') {
      return res.status(400).json({ error: 'Cantidad invalida' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    await CartService.updateCartItem(userId, itemId, quantity);
    res.json({ message: 'Cart item updated' });
  } catch (error: any) {
    console.error('Update cart item error:', error);
    if (error.name === 'InsufficientStockError') {
      return res.status(409).json(mapStockError(error.stock));
    }
    if (error.message === 'ITEM_NOT_FOUND' || error.message === 'UNAUTHORIZED') {
      return res.status(404).json({ error: 'Item de carrito no encontrado' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { itemId } = req.params;

    await CartService.removeCartItem(userId, itemId);
    res.json({ message: 'Cart item removed' });
  } catch (error: any) {
    console.error('Remove cart item error:', error);
    if (error.message === 'ITEM_NOT_FOUND' || error.message === 'UNAUTHORIZED') {
      return res.status(404).json({ error: 'Item de carrito no encontrado' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const emptyCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await CartService.emptyCart(userId);
    res.json({ message: 'Cart emptied' });
  } catch (error: any) {
    console.error('Empty cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
