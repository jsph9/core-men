import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('cart')
@UseGuards(RolesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Roles(Role.CLIENT, Role.MERCHANT)
  async getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  @Roles(Role.CLIENT, Role.MERCHANT)
  async addToCart(@Req() req: any, @Body() data: AddToCartDto) {
    return this.cartService.addToCart(req.user.userId, data);
  }

  @Patch('items/:id')
  @Roles(Role.CLIENT, Role.MERCHANT)
  async updateItem(@Req() req: any, @Param('id') id: string, @Body() data: UpdateCartItemDto) {
    return this.cartService.updateCartItem(req.user.userId, id, data);
  }

  @Delete('items/:id')
  @Roles(Role.CLIENT, Role.MERCHANT)
  async removeItem(@Req() req: any, @Param('id') id: string) {
    return this.cartService.removeCartItem(req.user.userId, id);
  }

  @Delete()
  @Roles(Role.CLIENT, Role.MERCHANT)
  async emptyCart(@Req() req: any) {
    await this.cartService.emptyCart(req.user.userId);
    return { success: true };
  }
}

