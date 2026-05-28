import prisma from '../lib/prisma';
export interface ProductFilters {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
}

export class ProductRepository {
  static async findMany(filters: ProductFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = filters.includeInactive ? {} : { isActive: true };

    if (filters.category) {
      whereClause.category = {
        name: {
          equals: filters.category,
          mode: 'insensitive',
        },
      };
    }

    if (filters.search) {
      whereClause.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    return prisma.product.findMany({
      where: whereClause,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: true,
        fabric: true,
      },
      skip,
      take: limit,
    });
  }

  static async count(filters: ProductFilters) {
    const whereClause: any = filters.includeInactive ? {} : { isActive: true };

    if (filters.category) {
      whereClause.category = {
        name: {
          equals: filters.category,
          mode: 'insensitive',
        },
      };
    }

    if (filters.search) {
      whereClause.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    return prisma.product.count({ where: whereClause });
  }

  static async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        fabric: true,
        variants: {
          include: {
            size: true,
          },
        },
        images: true,
        sizeGuide: true,
      },
    });
  }

  static async create(data: {
    name: string;
    description?: string;
    basePrice: number;
    categoryId: string;
    fabricId: string;
    sizeGuideText?: string;
    isBaseProduct?: boolean;
    imageUrl?: string;
    variants?: Array<{ sizeId: string; color: string; stock: number; price?: number; discountPct?: number }>;
  }) {
    return prisma.$transaction(async (tx) => {
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

  static async update(
    id: string,
    previous: any,
    data: {
      name?: string;
      description?: string;
      basePrice?: number;
      categoryId?: string;
      fabricId?: string;
      sizeGuideText?: string;
      isBaseProduct?: boolean;
      isActive?: boolean;
      imageUrl?: string;
      variants?: Array<{ id?: string; sizeId: string; color: string; stock: number; price?: number; discountPct?: number; isActive?: boolean }>;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          basePrice: data.basePrice !== undefined ? data.basePrice : undefined,
          categoryId: data.categoryId,
          fabricId: data.fabricId,
          sizeGuideText: data.sizeGuideText,
          isBaseProduct: data.isBaseProduct ?? previous.isBaseProduct,
          isActive: typeof data.isActive === 'boolean' ? data.isActive : previous.isActive,
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
          const keepCombinations = data.variants.map((v: any) => ({ sizeId: v.sizeId, color: v.color }));
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

  static async hasHistory(id: string) {
    const hasOrderItems = await prisma.orderItem.findFirst({
      where: { productVariant: { productId: id } },
    });
    const hasQuoteItems = await prisma.quoteItem.findFirst({
      where: { productVariant: { productId: id } },
    });
    return !!(hasOrderItems || hasQuoteItems);
  }

  static async softDelete(id: string) {
    return prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { isActive: false },
      }),
      prisma.productVariant.updateMany({
        where: { productId: id },
        data: { isActive: false },
      }),
    ]);
  }

  static async hardDelete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.sizeGuide.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productVariant: { productId: id } } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
  }
}
