import { Request, Response } from 'express';
import { registerUser, loginUser, requestPasswordReset, resetPassword } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';

export const register = async (req: Request, res: Response) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    const status = error.message === 'Email already in use' ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { token, role } = await loginUser(email, password);

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({ message: 'Login successful', role });
  } catch (error: any) {
    const msg = error.message;
    const status = msg.includes('locked') ? 403 : 401;
    res.status(status).json({ error: msg });
  }
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logout successful' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    await requestPasswordReset(req.body.email);
    res.json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleResetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    await resetPassword(token, password);
    res.json({ message: 'Contraseña actualizada con éxito.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await UserRepository.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { id, email, name, role, whatsappNumber } = user;
    res.json({ id, email, name, role, whatsappNumber });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
