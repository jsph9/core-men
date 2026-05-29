import { Controller, Post, Body, HttpCode, HttpStatus, Res, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestResetDto, ResetPasswordDto } from './dto/reset-password.dto';
import type { Response } from 'express';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    });

    return { role: result.role };
  }

  @Get('me')
  @UseGuards(RolesGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token');
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('password-reset/request')
  async requestReset(@Body() requestResetDto: RequestResetDto) {
    await this.authService.requestPasswordReset(requestResetDto);
    // Siempre retorna OK para no revelar correos registrados
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('password-reset/confirm')
  async confirmReset(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return { success: true };
  }
}

