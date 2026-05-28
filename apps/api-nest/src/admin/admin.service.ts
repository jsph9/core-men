import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
          ...(data.imageUrl ? {
            images: {
              create: [{ url: data.imageUrl, isPrimary: true }],
            },
          } : {}),
        },
      });

      if (data.variants && data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: product.id,
            sizeId: v.sizeId,
            color: v.color,
            stock: v.stock,
            price: v.price ?? null,
            discountPct: v.discountPct ?? null,
          })),
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: { include: { size: true } }, images: true, category: true, fabric: true, sizeGuide: true },
      });
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
          const keepCombinations = data.variants.map(v => ({ sizeId: v.sizeId, color: v.color }));
          await tx.productVariant.updateMany({
            where: { productId: id, NOT: { OR: keepCombinations } },
            data: { isActive: false },
          });

          for (const v of data.variants) {
            await tx.productVariant.upsert({
              where: { productId_sizeId_color: { productId: id, sizeId: v.sizeId, color: v.color } },
              update: {
                stock: v.stock,
                price: v.price ?? null,
                discountPct: v.discountPct ?? null,
                isActive: v.isActive ?? true,
              },
              create: {
                productId: id,
                sizeId: v.sizeId,
                color: v.color,
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

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          variants: { include: { size: true } },
          images: true,
          category: true,
          fabric: true,
          sizeGuide: true,
        },
      });
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
}

