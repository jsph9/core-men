import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    console.log('[NestJS RolesGuard] Request headers:', request.headers);
    console.log('[NestJS RolesGuard] Request cookies:', request.cookies);
    const token = this.extractTokenFromCookie(request);
    console.log('[NestJS RolesGuard] Extracted token:', token);

    if (!token) {
      if (!requiredRoles) return true; // Si la ruta no está protegida
      throw new UnauthorizedException('Inicie sesión para continuar');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload; // Inject the user context into the request

      if (!requiredRoles || requiredRoles.length === 0) {
        return true; // Autenticado pero no requiere roles específicos
      }

      if (!requiredRoles.includes(payload.role)) {
        throw new ForbiddenException('No tiene permisos para acceder a esta ruta');
      }

      return true;
    } catch {
      throw new UnauthorizedException('Sesión expirada o inválida');
    }
  }

  private extractTokenFromCookie(request: any): string | undefined {
    return request.cookies?.['auth_token'];
  }
}
