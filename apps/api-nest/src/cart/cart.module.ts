import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { DiscountService } from './discount.service';

@Module({
  controllers: [CartController],
  providers: [CartService, DiscountService],
  exports: [DiscountService],
})
export class CartModule {}
