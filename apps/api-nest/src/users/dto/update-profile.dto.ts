import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(16, { message: 'La contraseña debe tener máximo 16 caracteres' })
  @Matches(/[A-Z]/, { message: 'La contraseña debe tener al menos una mayúscula' })
  @Matches(/[0-9]/, { message: 'La contraseña debe tener al menos un número' })
  newPassword?: string;
}
