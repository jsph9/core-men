import { Controller, Patch, Get, Body, Req, UseGuards, Param, Query } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { QuotesService } from '../quotes/quotes.service';
import { UpdateMerchantProfileDto } from './dto/merchant.dto';
import { RespondQuoteDto, MarkUnfeasibleDto } from '../quotes/dto/quotes.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, QuoteMacroStatus } from '@prisma/client';

@Controller('merchant')
@UseGuards(RolesGuard)
export class MerchantController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly quotesService: QuotesService,
  ) {}

  @Patch('profile')
  @Roles(Role.MERCHANT)
  async updateProfile(@Req() req: any, @Body() data: UpdateMerchantProfileDto) {
    const updated = await this.merchantService.updateMerchantProfile(req.user.userId, data);
    return { message: 'Profile updated successfully', user: updated };
  }

  @Get('quotes')
  @Roles(Role.MERCHANT)
  async getMerchantQuotes(@Query('status') status?: QuoteMacroStatus) {
    return this.quotesService.getMerchantQuotes(status);
  }

  @Get('quotes/:id')
  @Roles(Role.MERCHANT)
  async getMerchantQuoteById(@Req() req: any, @Param('id') id: string) {
    return this.quotesService.getMerchantQuoteById(id, req.user.userId);
  }

  @Patch('quotes/:id/respond')
  @Roles(Role.MERCHANT)
  async respondToQuote(@Req() req: any, @Param('id') id: string, @Body() data: RespondQuoteDto) {
    return this.quotesService.respondToQuote(req.user.userId, id, data);
  }

  @Patch('quotes/:id/unfeasible')
  @Roles(Role.MERCHANT)
  async markUnfeasible(@Req() req: any, @Param('id') id: string, @Body() data: MarkUnfeasibleDto) {
    return this.quotesService.markUnfeasible(req.user.userId, id, data);
  }
}
