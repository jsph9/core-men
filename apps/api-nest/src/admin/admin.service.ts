import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../shared/audit.service';
import { EmailService } from '../shared/email.service';
import { CreateProductDto, UpdateProductDto } from './dto/admin.dto';
import { AuditEventType, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  // ──── Products ──────────────────────────────────────────────────────────
  async createProduct(data: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          categoryId: data.categoryId,
          fabricId: data.fabricId,
          sizeGuideText: data.sizeGuideText,
          isBaseProduct: data.isBaseProduct ?? true,
          fiberComposition: data.fiberComposition ?? '100% Algodón',
          careInstructions: data.careInstructions ?? 'Lavar a máquina en frío con colores similares',
          ...(data.imageUrl ? {
            images: {
              create: [{ url: data.imageUrl, isPrimary: true }],
            },
          } : {}),
        },
      });

      if (data.variants && data.variants.length > 0) {
        // Resolve all unique colors
        const uniqueColors = Array.from(new Set(data.variants.map(v => v.color)));
        const colorMap = new Map<string, string>();
        for (const colorStr of uniqueColors) {
          const cleanColor = colorStr.trim();
          let colorRecord = await tx.color.findFirst({
            where: {
              OR: [
                { name: { equals: cleanColor, mode: 'insensitive' } },
                { hexCode: { equals: cleanColor, mode: 'insensitive' } }
              ]
            }
          });
          if (!colorRecord) {
            const isHex = cleanColor.startsWith('#');
            colorRecord = await tx.color.create({
              data: {
                name: isHex ? `Color ${cleanColor}` : cleanColor,
                hexCode: isHex ? cleanColor : '#000000',
              }
            });
          }
          colorMap.set(colorStr, colorRecord.id);
        }

        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: product.id,
            sizeId: v.sizeId,
            colorId: colorMap.get(v.color)!,
            stock: v.stock,
            price: v.price ?? null,
            discountPct: v.discountPct ?? null,
          })),
        });
      }

      const createdProd = await tx.product.findUnique({
        where: { id: product.id },
        include: { variants: { include: { size: true, color: true } }, images: true, category: true, fabric: true, sizeGuide: true },
      });
      if (!createdProd) return null;
      return {
        ...createdProd,
        variants: createdProd.variants.map((v) => ({
          ...v,
          color: v.color?.name || '',
        })),
      };
    });
  }

  async updateProduct(id: string, data: UpdateProductDto) {
    const previous = await this.prisma.product.findUnique({ where: { id } });
    if (!previous) throw new NotFoundException('Producto no encontrado');

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          categoryId: data.categoryId,
          fabricId: data.fabricId,
          sizeGuideText: data.sizeGuideText,
          isBaseProduct: data.isBaseProduct ?? previous.isBaseProduct,
          isActive: data.isActive ?? previous.isActive,
          fiberComposition: data.fiberComposition ?? previous.fiberComposition,
          careInstructions: data.careInstructions ?? previous.careInstructions,
        },
      });

      if (typeof data.imageUrl === 'string') {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (data.imageUrl.trim()) {
          await tx.productImage.create({
            data: { productId: id, url: data.imageUrl, isPrimary: true },
          });
        }
      }

      if (data.variants) {
        if (data.variants.length > 0) {
          // Resolve all unique colors
          const uniqueColors = Array.from(new Set(data.variants.map(v => v.color)));
          const colorMap = new Map<string, string>();
          for (const colorStr of uniqueColors) {
            const cleanColor = colorStr.trim();
            let colorRecord = await tx.color.findFirst({
              where: {
                OR: [
                  { name: { equals: cleanColor, mode: 'insensitive' } },
                  { hexCode: { equals: cleanColor, mode: 'insensitive' } }
                ]
              }
            });
            if (!colorRecord) {
              const isHex = cleanColor.startsWith('#');
              colorRecord = await tx.color.create({
                data: {
                  name: isHex ? `Color ${cleanColor}` : cleanColor,
                  hexCode: isHex ? cleanColor : '#000000',
                }
              });
            }
            colorMap.set(colorStr, colorRecord.id);
          }

          const keepCombinations = data.variants.map(v => ({
            sizeId: v.sizeId,
            colorId: colorMap.get(v.color)!,
          }));

          await tx.productVariant.updateMany({
            where: { productId: id, NOT: { OR: keepCombinations } },
            data: { isActive: false },
          });

          for (const v of data.variants) {
            const colorId = colorMap.get(v.color)!;
            await tx.productVariant.upsert({
              where: {
                productId_sizeId_colorId: {
                  productId: id,
                  sizeId: v.sizeId,
                  colorId,
                }
              },
              update: {
                stock: v.stock,
                price: v.price ?? null,
                discountPct: v.discountPct ?? null,
                isActive: v.isActive ?? true,
              },
              create: {
                productId: id,
                sizeId: v.sizeId,
                colorId,
                stock: v.stock,
                price: v.price ?? null,
                discountPct: v.discountPct ?? null,
                isActive: v.isActive ?? true,
              },
            });
          }
        } else {
          await tx.productVariant.updateMany({
            where: { productId: id },
            data: { isActive: false },
          });
        }
      }

      const updatedProd = await tx.product.findUnique({
        where: { id: product.id },
        include: {
          variants: { include: { size: true, color: true } },
          images: true,
          category: true,
          fabric: true,
          sizeGuide: true,
        },
      });
      if (!updatedProd) return null;
      return {
        ...updatedProd,
        variants: updatedProd.variants.map((v) => ({
          ...v,
          color: v.color?.name || '',
        })),
      };
    });
  }

  async deleteProduct(id: string) {
    const hasOrderItems = await this.prisma.orderItem.findFirst({
      where: { productVariant: { productId: id } },
    });
    const hasQuoteItems = await this.prisma.quoteItem.findFirst({
      where: { productVariant: { productId: id } },
    });
    
    const hasHistory = !!(hasOrderItems || hasQuoteItems);

    if (hasHistory) {
      // Soft Delete
      await this.prisma.$transaction([
        this.prisma.product.update({
          where: { id },
          data: { isActive: false },
        }),
        this.prisma.productVariant.updateMany({
          where: { productId: id },
          data: { isActive: false },
        }),
      ]);
      return { message: 'Soft delete realizado', method: 'soft' };
    } else {
      // Hard Delete
      await this.prisma.$transaction(async (tx) => {
        await tx.sizeGuide.deleteMany({ where: { productId: id } });
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.cartItem.deleteMany({ where: { productVariant: { productId: id } } });
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.product.delete({ where: { id } });
      });
      return { message: 'Hard delete realizado', method: 'hard' };
    }
  }

  // ──── Attributes ────────────────────────────────────────────────────────
  async getAttributes(includeInactive: boolean) {
    const where = includeInactive ? undefined : { isActive: true };
    const [categories, fabrics, sizes] = await Promise.all([
      this.prisma.category.findMany({ where, orderBy: { name: 'asc' } }),
      this.prisma.fabricAttribute.findMany({ where, orderBy: { value: 'asc' } }),
      this.prisma.sizeAttribute.findMany({ where, orderBy: { value: 'asc' } }),
    ]);
    return { categories, fabrics, sizes };
  }

  async createCategory(name: string, userId: string, ipAddress?: string) {
    if (!name || name.trim() === '') {
      throw new BadRequestException('El nombre de la categoría no puede estar vacío.');
    }
    const cleanName = name.trim();
    const existing = await this.prisma.category.findUnique({ where: { name: cleanName } });
    if (existing) {
      throw new ConflictException('Ya existe una categoría con ese nombre.');
    }
    const created = await this.prisma.category.create({ data: { name: cleanName } });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'Category',
      entityId: created.id,
      newValue: created,
      ipAddress,
    });
    return created;
  }

  async updateCategory(id: string, name?: string, isActive?: boolean, userId?: string, ipAddress?: string) {
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        throw new BadRequestException('El nombre de la categoría no puede estar vacío.');
      }
      const cleanName = name.trim();
      const existing = await this.prisma.category.findFirst({
        where: { name: cleanName, id: { not: id } }
      });
      if (existing) {
        throw new ConflictException('Ya existe otra categoría con ese nombre.');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: typeof name === 'string' ? name.trim() : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId: userId || 'system',
      entityType: 'Category',
      entityId: updated.id,
      newValue: updated,
      ipAddress,
    });
    return updated;
  }

  async deleteCategory(id: string, userId: string, ipAddress?: string) {
    const hasProducts = await this.prisma.product.findFirst({ where: { categoryId: id } });
    if (hasProducts) {
      throw new ConflictException('No se puede eliminar la categoría porque hay productos que la usan.');
    }
    await this.prisma.category.delete({ where: { id } });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'Category',
      entityId: id,
      newValue: { action: 'HARD_DELETE' },
      ipAddress,
    });
    return { message: 'Categoría eliminada' };
  }

  async createFabric(value: string, userId: string, ipAddress?: string) {
    if (!value || value.trim() === '') {
      throw new BadRequestException('El valor de la tela no puede estar vacío.');
    }
    const cleanValue = value.trim();
    const existing = await this.prisma.fabricAttribute.findFirst({ where: { value: cleanValue } });
    if (existing) {
      throw new ConflictException('Ya existe esta tela en el sistema.');
    }
    const created = await this.prisma.fabricAttribute.create({ data: { value: cleanValue } });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'FabricAttribute',
      entityId: created.id,
      newValue: created,
      ipAddress,
    });
    return created;
  }

  async updateFabric(id: string, value?: string, isActive?: boolean, userId?: string, ipAddress?: string) {
    if (value !== undefined) {
      if (!value || value.trim() === '') {
        throw new BadRequestException('El valor de la tela no puede estar vacío.');
      }
      const cleanValue = value.trim();
      const existing = await this.prisma.fabricAttribute.findFirst({
        where: { value: cleanValue, id: { not: id } }
      });
      if (existing) {
        throw new ConflictException('Ya existe otra tela con ese valor.');
      }
    }

    const updated = await this.prisma.fabricAttribute.update({
      where: { id },
      data: {
        value: typeof value === 'string' ? value.trim() : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId: userId || 'system',
      entityType: 'FabricAttribute',
      entityId: updated.id,
      newValue: updated,
      ipAddress,
    });
    return updated;
  }

  async deleteFabric(id: string, userId: string, ipAddress?: string) {
    const hasProducts = await this.prisma.product.findFirst({ where: { fabricId: id } });
    if (hasProducts) {
      throw new ConflictException('No se puede eliminar la tela porque hay productos que la usan.');
    }
    await this.prisma.fabricAttribute.delete({ where: { id } });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'FabricAttribute',
      entityId: id,
      newValue: { action: 'HARD_DELETE' },
      ipAddress,
    });
    return { message: 'Tela eliminada' };
  }

  async createSize(value: string, userId: string, ipAddress?: string, abbreviation?: string) {
    if (!value || value.trim() === '') {
      throw new BadRequestException('El valor de la talla no puede estar vacío.');
    }
    const cleanValue = value.trim();
    const existing = await this.prisma.sizeAttribute.findFirst({ where: { value: cleanValue } });
    if (existing) {
      throw new ConflictException('Ya existe esta talla en el sistema.');
    }

    let cleanAbbr = abbreviation?.trim();
    if (!cleanAbbr) {
      if (cleanValue.length <= 3) {
        cleanAbbr = cleanValue.toUpperCase();
      } else {
        const words = cleanValue.split(/\s+/);
        if (words.length > 1) {
          cleanAbbr = words.map(w => w[0]).join('').toUpperCase();
        } else {
          cleanAbbr = cleanValue[0].toUpperCase();
        }
      }
    }

    const created = await this.prisma.sizeAttribute.create({
      data: {
        value: cleanValue,
        abbreviation: cleanAbbr,
      }
    });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'SizeAttribute',
      entityId: created.id,
      newValue: created,
      ipAddress,
    });
    return created;
  }

  async updateSize(id: string, value?: string, abbreviation?: string, isActive?: boolean, userId?: string, ipAddress?: string) {
    if (value !== undefined) {
      if (!value || value.trim() === '') {
        throw new BadRequestException('El valor de la talla no puede estar vacío.');
      }
      const cleanValue = value.trim();
      const existing = await this.prisma.sizeAttribute.findFirst({
        where: { value: cleanValue, id: { not: id } }
      });
      if (existing) {
        throw new ConflictException('Ya existe otra talla con ese valor.');
      }
    }

    const updated = await this.prisma.sizeAttribute.update({
      where: { id },
      data: {
        value: typeof value === 'string' ? value.trim() : undefined,
        abbreviation: typeof abbreviation === 'string' ? abbreviation.trim() : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
      },
    });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId: userId || 'system',
      entityType: 'SizeAttribute',
      entityId: updated.id,
      newValue: updated,
      ipAddress,
    });
    return updated;
  }

  async deleteSize(id: string, userId: string, ipAddress?: string) {
    const hasVariants = await this.prisma.productVariant.findFirst({ where: { sizeId: id } });
    if (hasVariants) {
      throw new ConflictException('No se puede eliminar la talla porque hay variantes de producto que la usan.');
    }
    await this.prisma.sizeAttribute.delete({ where: { id } });
    await this.auditService.logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'SizeAttribute',
      entityId: id,
      newValue: { action: 'HARD_DELETE' },
      ipAddress,
    });
    return { message: 'Talla eliminada' };
  }

  // ──── User Management ──────────────────────────────────────────────────
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, lockedUntil: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName || ''}`.trim(),
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lockedUntil: user.lockedUntil,
    }));
  }

  async createUser(data: any, adminId: string, ipAddress?: string) {
    if (!data.email || !data.password || !data.name || !data.role) {
      throw new BadRequestException('Faltan campos requeridos.');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con este correo electrónico.');
    }
    const passwordHash = await bcrypt.hash(data.password, 12);

    let firstName = data.firstName || '';
    let lastName = data.lastName || '';
    if (!firstName && data.name) {
      const parts = data.name.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName,
        lastName,
        passwordHash,
        role: data.role,
        isActive: data.isActive ?? true,
      }
    });

    const fullName = `${user.firstName} ${user.lastName || ''}`.trim();

    await this.auditService.logAudit({
      type: 'USER_MGMT',
      userId: adminId,
      entityType: 'User',
      entityId: user.id,
      newValue: { name: fullName, email: user.email, role: user.role, isActive: user.isActive },
      ipAddress,
    });

    return {
      ...user,
      name: fullName,
    };
  }

  async updateUser(id: string, data: any, adminId: string, ipAddress?: string) {
    const updateData: any = {};
    if (data.name !== undefined) {
      const parts = data.name.trim().split(/\s+/);
      updateData.firstName = parts[0] || '';
      updateData.lastName = parts.slice(1).join(' ') || '';
    }
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const fullName = `${updated.firstName} ${updated.lastName || ''}`.trim();

    await this.auditService.logAudit({
      type: 'USER_MGMT',
      userId: adminId,
      entityType: 'User',
      entityId: id,
      newValue: { name: fullName, email: updated.email, role: updated.role, isActive: updated.isActive },
      ipAddress,
    });

    return {
      ...updated,
      name: fullName,
    };
  }

  async revokeUser(id: string, adminId: string, ipAddress?: string) {
    const updated = await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.auditService.logAudit({
      type: 'USER_MGMT',
      userId: adminId,
      entityType: 'User',
      entityId: id,
      previousValue: { isActive: true },
      newValue: { isActive: false },
      ipAddress,
    });
    return updated;
  }

  async unlockUser(id: string, adminId: string, ipAddress?: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.auditService.logAudit({
      type: 'USER_MGMT',
      userId: adminId,
      entityType: 'User',
      entityId: id,
      newValue: { action: 'UNLOCK' },
      ipAddress,
    });
    await this.emailService.sendAccountUnlockedEmail(user.email);
    return { message: 'Account unlocked' };
  }

  async activateUser(id: string, adminId: string, ipAddress?: string) {
    const updated = await this.prisma.user.update({ where: { id }, data: { isActive: true } });
    await this.auditService.logAudit({
      type: 'USER_MGMT',
      userId: adminId,
      entityType: 'User',
      entityId: id,
      newValue: { action: 'ACTIVATE' },
      ipAddress,
    });
    return { message: 'Account activated', user: updated };
  }

  // ──── Discount Management ──────────────────────────────────────────────
  async getVolumeDiscounts() {
    return this.prisma.discountRule.findMany({ orderBy: { minQuantity: 'asc' } });
  }

  async createVolumeDiscount(data: any, adminId: string, ipAddress?: string) {
    const rule = await this.prisma.discountRule.create({
      data: {
        minQuantity: Number(data.minQuantity),
        maxQuantity: data.maxQuantity ? Number(data.maxQuantity) : null,
        percentage: new Prisma.Decimal(data.percentage),
        isActive: data.isActive ?? true,
      }
    });
    await this.auditService.logAudit({
      type: 'DISCOUNT_CONFIG',
      userId: adminId,
      entityType: 'DiscountRule',
      entityId: rule.id,
      newValue: rule,
      ipAddress,
    });
    return rule;
  }

  async updateVolumeDiscount(id: string, data: any, adminId: string, ipAddress?: string) {
    const updated = await this.prisma.discountRule.update({
      where: { id },
      data: {
        minQuantity: data.minQuantity !== undefined ? Number(data.minQuantity) : undefined,
        maxQuantity: data.maxQuantity !== undefined ? (data.maxQuantity ? Number(data.maxQuantity) : null) : undefined,
        percentage: data.percentage !== undefined ? new Prisma.Decimal(data.percentage) : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      }
    });
    await this.auditService.logAudit({
      type: 'DISCOUNT_CONFIG',
      userId: adminId,
      entityType: 'DiscountRule',
      entityId: id,
      newValue: updated,
      ipAddress,
    });
    return updated;
  }

  async deleteVolumeDiscount(id: string, adminId: string, ipAddress?: string) {
    await this.prisma.discountRule.delete({ where: { id } });
    await this.auditService.logAudit({
      type: 'DISCOUNT_CONFIG',
      userId: adminId,
      entityType: 'DiscountRule',
      entityId: id,
      newValue: { action: 'DELETE' },
      ipAddress,
    });
    return { success: true };
  }

  async getSeasonDiscounts() {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.seasonDiscount.updateMany({
        where: {
          status: 'SCHEDULED',
          startDate: { lte: now },
          endDate: { gte: now },
        },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.seasonDiscount.updateMany({
        where: {
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          endDate: { lt: now },
        },
        data: { status: 'EXPIRED' },
      }),
    ]);
    return this.prisma.seasonDiscount.findMany({ orderBy: { startDate: 'desc' } });
  }

  async createSeasonDiscount(data: any, adminId: string, ipAddress?: string) {
    const season = await this.prisma.seasonDiscount.create({
      data: {
        name: data.name,
        percentage: new Prisma.Decimal(data.percentage),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isAccumulative: data.isAccumulative ?? false,
        status: data.status ?? 'SCHEDULED',
        appliesTo: data.appliesTo ?? [],
      }
    });
    await this.auditService.logAudit({
      type: 'DISCOUNT_CONFIG',
      userId: adminId,
      entityType: 'SeasonDiscount',
      entityId: season.id,
      newValue: season,
      ipAddress,
    });
    return season;
  }

  async updateSeasonDiscount(id: string, data: any, adminId: string, ipAddress?: string) {
    const updated = await this.prisma.seasonDiscount.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        percentage: data.percentage !== undefined ? new Prisma.Decimal(data.percentage) : undefined,
        startDate: data.startDate !== undefined ? new Date(data.startDate) : undefined,
        endDate: data.endDate !== undefined ? new Date(data.endDate) : undefined,
        isAccumulative: data.isAccumulative !== undefined ? Boolean(data.isAccumulative) : undefined,
        status: data.status !== undefined ? data.status : undefined,
        appliesTo: data.appliesTo !== undefined ? data.appliesTo : undefined,
      }
    });
    await this.auditService.logAudit({
      type: 'DISCOUNT_CONFIG',
      userId: adminId,
      entityType: 'SeasonDiscount',
      entityId: id,
      newValue: updated,
      ipAddress,
    });
    return updated;
  }

  async deleteSeasonDiscount(id: string, adminId: string, ipAddress?: string) {
    await this.prisma.seasonDiscount.delete({ where: { id } });
    await this.auditService.logAudit({
      type: 'DISCOUNT_CONFIG',
      userId: adminId,
      entityType: 'SeasonDiscount',
      entityId: id,
      newValue: { action: 'DELETE' },
      ipAddress,
    });
    return { success: true };
  }

  // ──── Dashboard & Reports ──────────────────────────────────────────────
  async getDashboardStats() {
    const [totalOrders, totalUsers, totalProducts, recentOrdersRaw] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const recentOrders = recentOrdersRaw.map(order => ({
      ...order,
      user: {
        name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'Cliente General',
      }
    }));

    return { totalOrders, totalUsers, totalProducts, recentOrders };
  }

  async getSalesReport(dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };

    const sales = await this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map(sale => ({
      ...sale,
      user: sale.user ? {
        id: sale.user.id,
        name: `${sale.user.firstName} ${sale.user.lastName || ''}`.trim(),
        email: sale.user.email,
      } : null,
    }));
  }

  // ──── Audit Log ────────────────────────────────────────────────────────
  async getAuditLogs(page: number, limit: number, type?: AuditEventType, userId?: string) {
    const where: any = {};
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const [logsRaw, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const logs = logsRaw.map(log => ({
      ...log,
      user: log.user ? {
        name: `${log.user.firstName} ${log.user.lastName || ''}`.trim(),
        email: log.user.email,
      } : null,
    }));

    return { data: logs, meta: { total, page, limit } };
  }

  // ──── Error Log ────────────────────────────────────────────────────────
  async getErrorLogs() {
    return this.prisma.errorLog.findMany({ orderBy: { timestamp: 'desc' }, take: 100 });
  }

  async reviewErrorLog(id: string, adminId: string) {
    return this.prisma.errorLog.update({
      where: { id },
      data: { isReviewed: true, reviewedBy: adminId, reviewedAt: new Date() },
    });
  }
}
