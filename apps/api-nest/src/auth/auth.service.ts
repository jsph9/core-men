import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000; // 30 min
const ATTEMPTS_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 min

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new BadRequestException('El correo ya está en uso');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = data.role === Role.MERCHANT ? Role.MERCHANT : Role.CLIENT;

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        maternalLastName: data.maternalLastName || null,
        passwordHash,
        role,
      },
    });

    // TODO: Emit event for Welcome Email
    return { 
      id: user.id, 
      email: user.email, 
      firstName: user.firstName, 
      lastName: user.lastName, 
      maternalLastName: user.maternalLastName, 
      role: user.role 
    };
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas o cuenta inactiva');
    }

    const now = Date.now();

    if (
      user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS &&
      user.lockedUntil &&
      user.lockedUntil.getTime() > now
    ) {
      throw new UnauthorizedException('Cuenta bloqueada. Intente más tarde.');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValid) {
      let attempts = user.failedLoginAttempts;
      let windowEndsAt = user.lockedUntil;

      if (!windowEndsAt || windowEndsAt.getTime() < now || attempts >= MAX_LOGIN_ATTEMPTS) {
        attempts = 1;
        windowEndsAt = new Date(now + ATTEMPTS_WINDOW_MS);
      } else {
        attempts += 1;
      }

      const lockUntil = attempts >= MAX_LOGIN_ATTEMPTS ? new Date(now + LOCK_TIME_MS) : windowEndsAt;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockUntil,
        },
      });

      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const token = this.jwtService.sign({ userId: user.id, role: user.role });
    return { token, role: user.role };
  }

  async requestPasswordReset(data: RequestResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) return;

    const token = uuidv4();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    // TODO: Emit event for Reset Email
  }

  async resetPassword(data: ResetPasswordDto) {
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: data.token },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const { id, email, firstName, lastName, maternalLastName, role, whatsappNumber } = user;
    return { id, email, firstName, lastName, maternalLastName, role, whatsappNumber };
  }
}

