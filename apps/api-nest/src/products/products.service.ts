import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GetProductsDto } from './dto/get-products.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getProducts(filters: GetProductsDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ProductWhereInput = filters.includeInactive
      ? {}
      : { isActive: true };

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

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: whereClause,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: true,
          fabric: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: whereClause }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductDetails(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        fabric: true,
        variants: {
          include: {
            size: true,
            color: true,
          },
        },
        images: true,
        sizeGuide: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return {
      ...product,
      variants: product.variants.map((v) => ({
        ...v,
        color: v.color?.name || '',
      })),
    };
  }
}

