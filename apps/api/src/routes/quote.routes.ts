import { Router } from 'express';
import { createQuote, approveQuote } from '../controllers/quote.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Cliente: Crear y gestionar cotizaciones propias
router.post('/', requireRole(Role.CLIENT), createQuote);
router.put('/:id/approve', requireRole(Role.CLIENT), approveQuote);
// router.put('/:id/reject', requireRole(Role.CLIENT), rejectQuote);

export default router;
