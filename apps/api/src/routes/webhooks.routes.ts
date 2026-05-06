import { Router } from 'express';
import express from 'express';
import { stripeWebhook } from '../controllers/webhooks.controller';

const router = Router();

// Stripe requiere el raw body para verificar la firma del webhook
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
