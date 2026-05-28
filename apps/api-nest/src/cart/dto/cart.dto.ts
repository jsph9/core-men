import { IsString, IsNumber, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productVariantId: string;

  @IsNumber()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;
}

export class UpdateCartItemDto {
  @IsNumber()
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  quantity: number;
}
