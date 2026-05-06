import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Role } from '@coremen/types';
import { logAudit } from '../services/audit.service';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, search, page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause: any = { isActive: true };
    
    if (category) {
      whereClause.categoryId = category as string;
    }
    
    if (search) {
      whereClause.name = { contains: search as string, mode: 'insensitive' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          category: true,
          fabric: true
        },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where: whereClause })
    ]);

    res.json({
      data: products,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const createProduct = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { name, description, basePrice, categoryId, fabricId, imageUrl, variants } = req.body;
    console.log("Creating product with data:", JSON.stringify(req.body, null, 2));

    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          description,
          basePrice: Number(basePrice),
          categoryId,
          fabricId,
          ...(imageUrl ? {
            images: {
              create: [{ url: imageUrl, isPrimary: true }]
            }
          } : {})
        }
      });

      if (variants && variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v: any) => ({
            productId: product.id,
            sizeId: v.sizeId,
            color: v.color,
            stock: Number(v.stock || 0),
            price: v.price ? Number(v.price) : null
          }))
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true, images: true }
      });
    });

    await logAudit({
      type: 'STOCK_ADJUST',
      userId: adminId,
      entityType: 'Product',
      entityId: newProduct!.id,
      newValue: newProduct as any
    });

    res.status(201).json(newProduct);
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getProductDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: { include: { size: true } },
        sizeGuide: true,
        category: true,
        fabric: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin - Deactivate product
export const deactivateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    // Verificar dependencias activas (pedidos en curso o cotizaciones pendientes)
    const hasActiveDependencies = await prisma.orderItem.findFirst({
      where: {
        productVariant: { productId: id },
        order: { status: { in: ['IN_PRODUCTION', 'READY_FOR_PICKUP', 'REGISTERED'] } }
      }
    }) || await prisma.quoteItem.findFirst({
      where: {
        productVariant: { productId: id },
        quote: { status: { in: ['PENDING', 'QUOTED', 'UNFEASIBLE'] } }
      }
    });

    if (hasActiveDependencies) {
      return res.status(409).json({ error: 'No es posible desactivar este producto. Tiene pedidos activos o cotizaciones pendientes.' });
    }

    const previousProduct = await prisma.product.findUnique({ where: { id } });

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    // Log the deactivation in the audit log
    await logAudit({
      type: 'STOCK_ADJUST',
      userId: adminId,
      entityType: 'Product',
      entityId: id,
      previousValue: previousProduct,
      newValue: updated
    });

    res.json(updated);
  } catch (error) {
    console.error('Deactivate product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
