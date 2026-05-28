import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsOptional()
  @IsString()
  @IsIn(['boleta', 'factura'])
  receiptType?: 'boleta' | 'factura';

  @IsOptional()
  @IsString()
  @IsIn(['card', 'debit', 'yape'])
  paymentMethod?: 'card' | 'debit' | 'yape';
}
