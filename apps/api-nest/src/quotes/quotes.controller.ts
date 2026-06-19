import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, RespondQuoteDto, MarkUnfeasibleDto } from './dto/quotes.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('quotes')
@UseGuards(RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  // Cliente
  @Get()
  @Roles(Role.CLIENT)
  async getClientQuotes(@Req() req: any) {
    return this.quotesService.getClientQuotes(req.user.userId);
  }

  @Post()
  @Roles(Role.CLIENT)
  async createQuote(@Req() req: any, @Body() data: CreateQuoteDto) {
    return this.quotesService.createQuote(req.user.userId, data);
  }

  @Patch(':id/approve')
  @Roles(Role.CLIENT)
  async approveQuote(@Req() req: any, @Param('id') id: string) {
    return this.quotesService.approveQuote(req.user.userId, id);
  }

  // Los endpoints de comerciante fueron movidos a MerchantController
}

