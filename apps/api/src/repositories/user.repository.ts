import prisma from '../lib/prisma';
import { Role } from '@coremen/types';

export class UserRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async create(data: { email: string; name: string; passwordHash: string; role: Role }) {
    return prisma.user.create({
      data,
    });
  }

  static async update(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async createResetToken(data: { userId: string; token: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({
      data,
    });
  }

  static async findResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
    });
  }

  static async updateResetToken(id: string, data: any) {
    return prisma.passwordResetToken.update({
      where: { id },
      data,
    });
  }

  static async resetPasswordTransaction(userId: string, passwordHash: string, tokenId: string) {
    return prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
    ]);
  }
}
