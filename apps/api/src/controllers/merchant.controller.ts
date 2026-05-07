import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const updateMerchantProfile = async (req: Request, res: Response) => {
  try {
    const { whatsappNumber } = req.body;
    const merchantId = req.user!.userId;

    const updated = await prisma.user.update({
      where: { id: merchantId },
      data: { whatsappNumber }
    });

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (error) {
    console.error('Update merchant profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
