import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRepository } from '../repositories/user.repository';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(16, 'La contraseña debe tener máximo 16 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe tener al menos un número')
    .optional(),
});

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const user = await UserRepository.findById(req.user!.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { id, email, name, role, whatsappNumber } = user;
    res.json({ id, email, name, role, whatsappNumber });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const parsed = updateProfileSchema.parse(req.body);

    if (!parsed.name && !parsed.email && !parsed.newPassword) {
      return res.status(400).json({ error: 'No hay cambios para actualizar' });
    }

    const currentUser = await UserRepository.findById(req.user!.userId);

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData: { name?: string; email?: string; passwordHash?: string } = {};

    if (parsed.name) {
      updateData.name = parsed.name;
    }

    if (parsed.email && parsed.email !== currentUser.email) {
      const emailInUse = await UserRepository.findByEmail(parsed.email);
      if (emailInUse) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updateData.email = parsed.email;
    }

    if (parsed.newPassword) {
      if (!parsed.currentPassword) {
        return res.status(400).json({ error: 'Debes ingresar tu contraseña actual' });
      }

      const isValidCurrentPassword = await bcrypt.compare(parsed.currentPassword, currentUser.passwordHash);
      if (!isValidCurrentPassword) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      updateData.passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    }

    const updated = await UserRepository.update(currentUser.id, updateData);

    const { id, email, name, role, whatsappNumber } = updated;
    res.json({ message: 'Perfil actualizado', user: { id, email, name, role, whatsappNumber } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0]?.message || 'Datos inválidos' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
