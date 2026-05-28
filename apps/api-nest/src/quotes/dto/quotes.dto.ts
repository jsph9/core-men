import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { QuoteStatus } from '@prisma/client';

export class CreateQuoteDto {
  @IsString()
  garmentType: string;

  @IsString()
  fabricType: string;

  @IsString()
  color: string;

  @IsNumber()
  @Min(1)
  totalQuantity: number;

  @IsOptional()
  @IsString()
  designImageUrl?: string;

  @IsOptional()
  @IsString()
  designZone?: string;

  @IsOptional()
  @IsNumber()
  designX?: number;

  @IsOptional()
  @IsNumber()
  designY?: number;

  @IsOptional()
  @IsNumber()
  designScaleX?: number;

  @IsOptional()
  @IsNumber()
  designScaleY?: number;

  @IsOptional()
  @IsNumber()
  designRotation?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  items?: any;
}

export class RespondQuoteDto {
  @IsNumber()
  @Min(0)
  quotedPrice: number;

  @IsOptional()
  @IsString()
  merchantMessage?: string;
}

export class MarkUnfeasibleDto {
  @IsString()
  unfeasibleReason: string;
}
