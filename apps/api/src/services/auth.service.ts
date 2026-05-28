import { UserRepository } from '../repositories/user.repository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail, sendWelcomeEmail } from './email.service';
import { z } from 'zod';
import { Role } from '@coremen/types';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000; // 30 min
const ATTEMPTS_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 min

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(16, 'La contraseña debe tener máximo 16 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
  .regex(/[0-9]/, 'La contraseña debe tener al menos un número');

export const registerUser = async (data: { email: string; password: string; name: string; role?: string }) => {
  passwordSchema.parse(data.password);

  const existing = await UserRepository.findByEmail(data.email);
  if (existing) throw new Error('Email already in use');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const role = data.role === 'MERCHANT' ? Role.MERCHANT : Role.CLIENT;

  const user = await UserRepository.create({
    email: data.email,
    name: data.name,
    passwordHash,
    role,
  });

  // Send welcome email (fire and forget)
  sendWelcomeEmail(user.email, user.name).catch(console.error);

  return { id: user.id, email: user.email, name: user.name, role: user.role };
};

export const loginUser = async (email: string, password: string) => {
  const user = await UserRepository.findByEmail(email);
  if (!user || !user.isActive) throw new Error('Invalid credentials or inactive account');

  const now = Date.now();

  // Check if locked (only when account reached lock threshold)
  if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS && user.lockedUntil && user.lockedUntil.getTime() > now) {
    throw new Error('Account is locked. Try again later.');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    let attempts = user.failedLoginAttempts;
    let windowEndsAt = user.lockedUntil;

    if (!windowEndsAt || windowEndsAt.getTime() < now || attempts >= MAX_LOGIN_ATTEMPTS) {
      attempts = 1;
      windowEndsAt = new Date(now + ATTEMPTS_WINDOW_MS);
    } else {
      attempts += 1;
    }

    const lockUntil = attempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(now + LOCK_TIME_MS)
      : windowEndsAt;

    await UserRepository.update(user.id, {
      failedLoginAttempts: attempts,
      lockedUntil: lockUntil,
    });

    throw new Error('Invalid credentials');
  }

  // Reset failed attempts
  if (user.failedLoginAttempts > 0) {
    await UserRepository.update(user.id, { failedLoginAttempts: 0, lockedUntil: null });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  return { token, role: user.role };
};

export const requestPasswordReset = async (email: string) => {
  const user = await UserRepository.findByEmail(email);
  if (!user) return; // Don't reveal if user exists

  const token = uuidv4();
  await UserRepository.createResetToken({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
  });

  await sendPasswordResetEmail(user.email, token);
};

export const resetPassword = async (token: string, newPassword: string) => {
  passwordSchema.parse(newPassword);

  const resetRecord = await UserRepository.findResetToken(token);
  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw new Error('Token inválido o expirado');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await UserRepository.resetPasswordTransaction(resetRecord.userId, passwordHash, resetRecord.id);
};
