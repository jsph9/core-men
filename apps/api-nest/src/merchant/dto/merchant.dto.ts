import { IsString, IsOptional } from 'class-validator';

export class UpdateMerchantProfileDto {
  @IsOptional()
  @IsString()
  whatsappNumber?: string;
}
