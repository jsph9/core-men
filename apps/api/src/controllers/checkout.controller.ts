import { Request, Response } from 'express';
import { createPaymentIntent } from '../services/payment.service';

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await createPaymentIntent(userId);
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Cart is empty' ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};
