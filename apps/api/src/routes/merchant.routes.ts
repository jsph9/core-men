import { Router } from 'express';
import { getMerchantQuotes, getMerchantQuoteById, respondToQuote, markUnfeasible } from '../controllers/quote.controller';
import { updateMerchantProfile } from '../controllers/merchant.controller';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@coremen/types';

const router = Router();

// Comerciante: Perfil
router.put('/profile', requireRole(Role.MERCHANT), updateMerchantProfile);

// Comerciante: Responder y gestionar cotizaciones
router.get('/quotes', requireRole(Role.MERCHANT), getMerchantQuotes);
router.get('/quotes/:id', requireRole(Role.MERCHANT), getMerchantQuoteById);
router.put('/quotes/:id/respond', requireRole(Role.MERCHANT), respondToQuote);
router.put('/quotes/:id/unfeasible', requireRole(Role.MERCHANT), markUnfeasible);

export default router;
