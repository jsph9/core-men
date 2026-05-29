import { Controller, Get, Put, Body, Param, UseGuards, Req, Res } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, OrderStatus } from '@prisma/client';
import type { Response } from 'express';

@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(Role.CLIENT)
  async getClientOrders(@Req() req: any) {
    return this.ordersService.getClientOrders(req.user.userId);
  }

  @Get('merchant')
  @Roles(Role.MERCHANT)
  async getMerchantOrders() {
    return this.ordersService.getMerchantOrders();
  }

  @Get(':id')
  @Roles(Role.CLIENT)
  async getOrderDetails(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.getOrderDetails(req.user.userId, id);
  }

  @Get(':id/receipt')
  @Roles(Role.CLIENT)
  async downloadOrderReceipt(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const { pdfBuffer, filename } = await this.ordersService.getOrderReceiptData(req.user.userId, id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  }

  @Put('merchant/:id/status')
  @Roles(Role.MERCHANT)
  async updateOrderStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; reason?: string },
  ) {
    return this.ordersService.updateOrderStatus(id, body.status, req.user.userId, body.reason);
  }
}
