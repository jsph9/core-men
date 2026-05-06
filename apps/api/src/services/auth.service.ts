import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sendPasswordResetEmail, sendWelcomeEmail } from './email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000; // 30 min
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 min

export const registerUser = async (data: { email: string; password: string; name: string; role?: string }) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('Email already in use');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const role = data.role === 'MERCHANT' ? 'MERCHANT' : 'CLIENT';

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: role as any,
    },
    select: { id: true, email: true, name: true, role: true }
  });

  // Send welcome email (fire and forget)
  sendWelcomeEmail(user.email, user.name).catch(console.error);

  return user;
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new Error('Invalid credentials or inactive account');

  // Check if locked
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new Error('Account is locked. Try again later.');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCK_TIME_MS) : null;
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil } });
    throw new Error('Invalid credentials');
  }

  // Reset failed attempts
  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  return { token, role: user.role };
};

export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Don't reveal if user exists

  const token = uuidv4();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    }
  });

  await sendPasswordResetEmail(user.email, token);
};

export const resetPassword = async (token: string, newPassword: string) => {
  const resetRecord = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw new Error('Token inválido o expirado');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } }),
  ]);
};
