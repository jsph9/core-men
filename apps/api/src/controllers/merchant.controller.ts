import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository';

export const updateMerchantProfile = async (req: Request, res: Response) => {
  try {
    const { whatsappNumber } = req.body;
    const merchantId = req.user!.userId;

    const updated = await UserRepository.update(merchantId, { whatsappNumber });

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (error) {
    console.error('Update merchant profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
