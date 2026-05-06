import { Router } from 'express';
import { respondToQuote, markUnfeasible } from '../controllers/quote.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Comerciante: Responder y gestionar cotizaciones
router.put('/quotes/:id/respond', requireRole(Role.MERCHANT), respondToQuote);
router.put('/quotes/:id/unfeasible', requireRole(Role.MERCHANT), markUnfeasible);
// router.put('/quotes/:id/reject', requireRole(Role.MERCHANT), rejectQuote);

export default router;
