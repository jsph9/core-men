import { Router } from 'express';
import { createCheckoutSession } from '../controllers/checkout.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

router.post('/session', requireRole(Role.CLIENT), createCheckoutSession);

export default router;
