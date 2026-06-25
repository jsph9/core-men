import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { QuoteMacroStatus } from '@prisma/client'; // Añade esta importación si no la tienes

export class UpdateMerchantProfileDto {
  @IsOptional()
  @IsString()
  whatsappNumber?: string;
}

// NUEVO DTO: Valida que llegue el estado para actualizar
export class UpdateOrderStatusDto {
  @IsNotEmpty()
  status: QuoteMacroStatus;
}