import { IsString, IsNumber, IsOptional, Min, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DesignPlacement } from '@prisma/client';

export class QuoteItemDto {
  @IsString()
  productVariantId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class DesignDto {
  @IsEnum(DesignPlacement)
  placement: DesignPlacement;

  @IsString()
  techniqueId: string;

  @IsString()
  baseGarmentUrl: string;

  @IsString()
  logoUrl: string;

  @IsNumber()
  positionX: number;

  @IsNumber()
  positionY: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsNumber()
  rotation: number;

  @IsNumber()
  canvasWidth: number;

  @IsNumber()
  canvasHeight: number;
}

export class CreateQuoteDto {
  @IsNumber()
  @Min(1)
  totalQuantity: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignDto)
  designs?: DesignDto[];
}

export class RespondQuoteDto {
  @IsNumber()
  @Min(0)
  quotedPrice: number;

  @IsOptional()
  @IsNumber()
  finalPrice?: number;

  @IsOptional()
  @IsString()
  merchantMessage?: string;

  @IsOptional()
  @IsNumber()
  estimatedProductionTime?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items?: QuoteItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignDto)
  designs?: DesignDto[];
}


export class MarkUnfeasibleDto {
  @IsString()
  unfeasibleReason: string;
}

export class RejectQuoteDto {
  @IsString()
  rejectionReason: string;
}
