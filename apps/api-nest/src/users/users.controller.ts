import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@Req() req: any) {
    return this.usersService.getMyProfile(req.user.userId);
  }

  @Put('me')
  async updateMyProfile(@Req() req: any, @Body() data: UpdateProfileDto) {
    return this.usersService.updateMyProfile(req.user.userId, data);
  }
}
