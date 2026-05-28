import { Router } from 'express';
import { getClientOrders, getOrderDetails, updateOrderStatus, downloadOrderReceipt } from '../controllers/order.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Cliente: Consultar su propio historial
router.get('/', requireRole(Role.CLIENT), getClientOrders);
router.get('/:id', requireRole(Role.CLIENT), getOrderDetails);
router.get('/:id/receipt', requireRole(Role.CLIENT), downloadOrderReceipt);

// Comerciante: Modificar estado de pedido
router.put('/merchant/:id/status', requireRole(Role.MERCHANT), updateOrderStatus);

export default router;
