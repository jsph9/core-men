import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RequestResetDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(16, { message: 'La contraseña debe tener máximo 16 caracteres' })
  @Matches(/[A-Z]/, { message: 'La contraseña debe tener al menos una mayúscula' })
  @Matches(/[0-9]/, { message: 'La contraseña debe tener al menos un número' })
  newPassword: string;
}
