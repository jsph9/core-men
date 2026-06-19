import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpStatus, HttpCode } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateProductDto, UpdateProductDto } from './dto/admin.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, AuditEventType } from '@prisma/client';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ──── Products ──────────────────────────────────────────────────────────
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

  // ──── Attributes (Categories, Fabrics, Sizes) ──────────────────────────
  @Get('attributes')
  async getAttributes(@Query('includeInactive') includeInactive?: string) {
    const isInclude = includeInactive === 'true';
    return this.adminService.getAttributes(isInclude);
  }

  @Post('categories')
  @Roles(Role.ADMIN)
  async createCategory(@Req() req: any, @Body('name') name: string) {
    return this.adminService.createCategory(name, req.user.userId, req.ip);
  }

  @Patch('categories/:id')
  @Roles(Role.ADMIN)
  async updateCategory(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.adminService.updateCategory(id, body.name, body.isActive, req.user.userId, req.ip);
  }

  @Delete('categories/:id')
  @Roles(Role.ADMIN)
  async deleteCategory(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteCategory(id, req.user.userId, req.ip);
  }

  @Post('fabrics')
  @Roles(Role.ADMIN)
  async createFabric(@Req() req: any, @Body('value') value: string) {
    return this.adminService.createFabric(value, req.user.userId, req.ip);
  }

  @Patch('fabrics/:id')
  @Roles(Role.ADMIN)
  async updateFabric(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { value?: string; isActive?: boolean },
  ) {
    return this.adminService.updateFabric(id, body.value, body.isActive, req.user.userId, req.ip);
  }

  @Delete('fabrics/:id')
  @Roles(Role.ADMIN)
  async deleteFabric(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteFabric(id, req.user.userId, req.ip);
  }

  @Post('sizes')
  @Roles(Role.ADMIN)
  async createSize(
    @Req() req: any,
    @Body() body: { value: string; abbreviation?: string },
  ) {
    return this.adminService.createSize(body.value, req.user.userId, req.ip, body.abbreviation);
  }

  @Patch('sizes/:id')
  @Roles(Role.ADMIN)
  async updateSize(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { value?: string; abbreviation?: string; isActive?: boolean },
  ) {
    return this.adminService.updateSize(id, body.value, body.abbreviation, body.isActive, req.user.userId, req.ip);
  }

  @Delete('sizes/:id')
  @Roles(Role.ADMIN)
  async deleteSize(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteSize(id, req.user.userId, req.ip);
  }

  // ──── User Management ──────────────────────────────────────────────────
  @Get('users')
  @Roles(Role.ADMIN)
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  @Roles(Role.ADMIN)
  async createUser(@Req() req: any, @Body() data: any) {
    return this.adminService.createUser(data, req.user.userId, req.ip);
  }

  @Patch('users/:id')
  @Roles(Role.ADMIN)
  async updateUser(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.adminService.updateUser(id, data, req.user.userId, req.ip);
  }

  @Patch('users/:id/revoke')
  @Roles(Role.ADMIN)
  async revokeUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.revokeUser(id, req.user.userId, req.ip);
  }

  @Patch('users/:id/unlock')
  @Roles(Role.ADMIN)
  async unlockUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.unlockUser(id, req.user.userId, req.ip);
  }

  @Patch('users/:id/activate')
  @Roles(Role.ADMIN)
  async activateUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.activateUser(id, req.user.userId, req.ip);
  }

  // ──── Discount Management ──────────────────────────────────────────────
  @Get('discounts/volume')
  @Roles(Role.ADMIN)
  async getVolumeDiscounts() {
    return this.adminService.getVolumeDiscounts();
  }

  @Post('discounts/volume')
  @Roles(Role.ADMIN)
  async createVolumeDiscount(@Req() req: any, @Body() body: any) {
    return this.adminService.createVolumeDiscount(body, req.user.userId, req.ip);
  }

  @Patch('discounts/volume/:id')
  @Roles(Role.ADMIN)
  async updateVolumeDiscount(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updateVolumeDiscount(id, body, req.user.userId, req.ip);
  }

  @Delete('discounts/volume/:id')
  @Roles(Role.ADMIN)
  async deleteVolumeDiscount(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteVolumeDiscount(id, req.user.userId, req.ip);
  }

  @Get('discounts/season')
  @Roles(Role.ADMIN)
  async getSeasonDiscounts() {
    return this.adminService.getSeasonDiscounts();
  }

  @Post('discounts/season')
  @Roles(Role.ADMIN)
  async createSeasonDiscount(@Req() req: any, @Body() body: any) {
    return this.adminService.createSeasonDiscount(body, req.user.userId, req.ip);
  }

  @Patch('discounts/season/:id')
  @Roles(Role.ADMIN)
  async updateSeasonDiscount(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updateSeasonDiscount(id, body, req.user.userId, req.ip);
  }

  @Delete('discounts/season/:id')
  @Roles(Role.ADMIN)
  async deleteSeasonDiscount(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteSeasonDiscount(id, req.user.userId, req.ip);
  }

  // ──── Dashboard & Reports ──────────────────────────────────────────────
  @Get('dashboard')
  @Roles(Role.ADMIN)
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('reports/sales')
  @Roles(Role.ADMIN)
  async getSalesReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.adminService.getSalesReport(dateFrom, dateTo);
  }

  // ──── Audit Log ────────────────────────────────────────────────────────
  @Get('audit-log')
  @Roles(Role.ADMIN)
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: AuditEventType,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Number(page || '1');
    const limitNum = Number(limit || '20');
    return this.adminService.getAuditLogs(pageNum, limitNum, type, userId);
  }

  // ──── Error Log ────────────────────────────────────────────────────────
  @Get('error-log')
  @Roles(Role.ADMIN)
  async getErrorLogs() {
    return this.adminService.getErrorLogs();
  }

  @Patch('error-log/:id/review')
  @Roles(Role.ADMIN)
  async reviewErrorLog(@Req() req: any, @Param('id') id: string) {
    return this.adminService.reviewErrorLog(id, req.user.userId);
  }
}
