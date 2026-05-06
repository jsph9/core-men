import { Router } from 'express';
import { getCart, addToCart, updateCartItem, emptyCart } from '../controllers/cart.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Solo los clientes pueden tener carrito de compras
router.use(requireRole(Role.CLIENT));

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/', emptyCart);

export default router;
