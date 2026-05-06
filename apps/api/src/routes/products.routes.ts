import { Router } from 'express';
import { getProducts, getProductDetails, deactivateProduct, createProduct } from '../controllers/products.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Públicos
router.get('/', getProducts);
router.get('/:id', getProductDetails);

// Admin
router.post('/', requireRole(Role.ADMIN), createProduct);
router.patch('/:id/deactivate', requireRole(Role.ADMIN), deactivateProduct);

export default router;
