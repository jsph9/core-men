import { ProductRepository, ProductFilters } from '../repositories/product.repository';
import { logAudit } from './audit.service';

export class ProductService {
  static async getProducts(filters: ProductFilters) {
    const products = await ProductRepository.findMany(filters);
    const total = await ProductRepository.count(filters);

    return {
      data: products,
      meta: {
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(total / (filters.limit || 10)),
      },
    };
  }

  static async getProductDetails(id: string) {
    return ProductRepository.findById(id);
  }

  static async createProduct(userId: string, data: any) {
    const newProduct = await ProductRepository.create(data);
    
    // Log audit for product creation
    await logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'Product',
      entityId: newProduct!.id,
      newValue: newProduct,
    });

    return newProduct;
  }

  static async updateProduct(userId: string, id: string, data: any) {
    const oldProduct = await ProductRepository.findById(id);
    if (!oldProduct) throw new Error('Producto no encontrado');
    const updatedProduct = await ProductRepository.update(id, oldProduct, data);

    // Log audit for update
    await logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'Product',
      entityId: id,
      previousValue: oldProduct,
      newValue: updatedProduct,
    });

    return updatedProduct;
  }

  static async deleteProduct(userId: string, id: string) {
    const hasHistory = await ProductRepository.hasHistory(id);
    if (hasHistory) {
      await ProductRepository.softDelete(id);
      await logAudit({
        type: 'STOCK_ADJUST',
        userId,
        entityType: 'Product',
        entityId: id,
        newValue: { action: 'SOFT_DELETE' },
      });
      return { message: 'El producto tiene historial de compras. Ha sido desactivado (borrado suave).' };
    }

    await ProductRepository.hardDelete(id);
    await logAudit({
      type: 'STOCK_ADJUST',
      userId,
      entityType: 'Product',
      entityId: id,
      newValue: { action: 'HARD_DELETE' },
    });
    return { message: 'Producto eliminado permanentemente.' };
  }
}
