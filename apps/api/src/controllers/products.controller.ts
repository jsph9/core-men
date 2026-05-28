import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, search, page = '1', limit = '10', includeInactive = 'false' } = req.query;

    const result = await ProductService.getProducts({
      category: category as string,
      search: search as string,
      page: Number(page),
      limit: Number(limit),
      includeInactive: includeInactive === 'true',
    });

    res.json(result);
  } catch (error: any) {
    console.error('Get products error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getProductDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await ProductService.getProductDetails(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    console.error('Get product details error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.userId;
    const { name, description, basePrice, categoryId, fabricId, imageUrl, variants, sizeGuideText, isBaseProduct } = req.body;

    const newProduct = await ProductService.createProduct(adminId, {
      name,
      description,
      basePrice: Number(basePrice),
      categoryId,
      fabricId,
      imageUrl,
      variants,
      sizeGuideText,
      isBaseProduct: isBaseProduct ?? true,
    });

    res.status(201).json(newProduct);
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;
    const { name, description, basePrice, categoryId, fabricId, imageUrl, variants, sizeGuideText, isBaseProduct, isActive } = req.body;

    const updated = await ProductService.updateProduct(adminId, id, {
      name,
      description,
      basePrice: basePrice !== undefined ? Number(basePrice) : undefined,
      categoryId,
      fabricId,
      imageUrl,
      variants,
      sizeGuideText,
      isBaseProduct,
      isActive,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    const result = await ProductService.deleteProduct(adminId, id);
    res.json(result);
  } catch (error: any) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
