import { Router } from 'express';
import { getProducts, getProductDetails, deleteProduct, createProduct, updateProduct } from '../controllers/products.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Públicos
router.get('/', getProducts);
router.get('/:id', getProductDetails);

// Admin
router.post('/', requireRole(Role.ADMIN), createProduct);
router.put('/:id', requireRole(Role.ADMIN), updateProduct);
router.delete('/:id', requireRole(Role.ADMIN), deleteProduct);

export default router;
