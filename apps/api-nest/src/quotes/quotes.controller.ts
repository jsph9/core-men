import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, RespondQuoteDto, MarkUnfeasibleDto } from './dto/quotes.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, QuoteStatus } from '@prisma/client';

@Controller('quotes')
@UseGuards(RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  // Cliente
  @Get('my-quotes')
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

  // Comerciante
  @Get('merchant')
  @Roles(Role.MERCHANT)
  async getMerchantQuotes(@Query('status') status?: QuoteStatus) {
    return this.quotesService.getMerchantQuotes(status);
  }

  @Get('merchant/:id')
  @Roles(Role.MERCHANT)
  async getMerchantQuoteById(@Param('id') id: string) {
    return this.quotesService.getMerchantQuoteById(id);
  }

  @Patch('merchant/:id/respond')
  @Roles(Role.MERCHANT)
  async respondToQuote(@Req() req: any, @Param('id') id: string, @Body() data: RespondQuoteDto) {
    return this.quotesService.respondToQuote(req.user.userId, id, data);
  }

  @Patch('merchant/:id/unfeasible')
  @Roles(Role.MERCHANT)
  async markUnfeasible(@Req() req: any, @Param('id') id: string, @Body() data: MarkUnfeasibleDto) {
    return this.quotesService.markUnfeasible(req.user.userId, id, data);
  }
}

