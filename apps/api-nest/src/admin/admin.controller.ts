import { Controller, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateProductDto, UpdateProductDto } from './dto/admin.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('products')
  @Roles(Role.ADMIN)
  async createProduct(@Body() data: CreateProductDto) {
    return this.adminService.createProduct(data);
  }

  @Patch('products/:id')
  @Roles(Role.ADMIN)
  async updateProduct(@Param('id') id: string, @Body() data: UpdateProductDto) {
    return this.adminService.updateProduct(id, data);
  }

  @Delete('products/:id')
  @Roles(Role.ADMIN)
  async deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }
}

