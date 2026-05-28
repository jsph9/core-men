import { Request, Response } from 'express';
import { createPaymentIntent } from '../services/payment.service';

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { receiptType = 'boleta', paymentMethod = 'card' } = req.body || {};

    if (!['boleta', 'factura'].includes(receiptType)) {
      return res.status(400).json({ error: 'Tipo de comprobante no valido' });
    }

    if (!['card', 'debit', 'yape'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Metodo de pago no valido' });
    }

    const result = await createPaymentIntent(userId, { receiptType, paymentMethod });
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Cart is empty' ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};
