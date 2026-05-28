import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateCheckoutDto } from './dto/checkout.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('orders/checkout')
@UseGuards(RolesGuard)
export class CheckoutController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @Roles(Role.CLIENT, Role.MERCHANT)
  async createCheckoutSession(@Req() req: any, @Body() data: CreateCheckoutDto) {
    return this.paymentService.createPaymentIntent(req.user.userId, data);
  }
}
