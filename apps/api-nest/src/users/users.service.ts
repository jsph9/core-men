import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }
    const { id, email, firstName, lastName, maternalLastName, role, whatsappNumber } = user;
    return { id, email, firstName, lastName, maternalLastName, role, whatsappNumber };
  }

  async updateMyProfile(userId: string, data: UpdateProfileDto) {
    if (!data.firstName && !data.lastName && !data.maternalLastName && !data.email && !data.newPassword) {
      throw new BadRequestException('No hay cambios para actualizar');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const updateData: { firstName?: string; lastName?: string; maternalLastName?: string | null; email?: string; passwordHash?: string } = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }
    if (data.maternalLastName !== undefined) {
      updateData.maternalLastName = data.maternalLastName || null;
    }

    if (data.email && data.email !== currentUser.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailInUse) {
        throw new BadRequestException('El correo ya está en uso');
      }
      updateData.email = data.email;
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestException('Debes ingresar tu contraseña actual');
      }

      const isValidCurrentPassword = await bcrypt.compare(data.currentPassword, currentUser.passwordHash);
      if (!isValidCurrentPassword) {
        throw new BadRequestException('Contraseña actual incorrecta');
      }

      updateData.passwordHash = await bcrypt.hash(data.newPassword, 12);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { id, email, firstName, lastName, maternalLastName, role, whatsappNumber } = updated;
    return { message: 'Perfil actualizado', user: { id, email, firstName, lastName, maternalLastName, role, whatsappNumber } };
  }
}
