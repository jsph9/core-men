import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { UpdateMerchantProfileDto } from './dto/merchant.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('merchant')
@UseGuards(RolesGuard)
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Patch('profile')
  @Roles(Role.MERCHANT)
  async updateProfile(@Req() req: any, @Body() data: UpdateMerchantProfileDto) {
    const updated = await this.merchantService.updateMerchantProfile(req.user.userId, data);
    return { message: 'Profile updated successfully', user: updated };
  }
}

