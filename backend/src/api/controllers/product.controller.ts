import { Response } from 'express';
import { ProductService } from '../../application/services/product.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { ProductCategory, ProductStatus, UnitOfMeasure } from '@prisma/client';

const productService = new ProductService();

export class ProductController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.category) filters.category = req.query.category as ProductCategory;
      if (req.query.status) filters.status = req.query.status as ProductStatus;
      if (req.query.manufacturer) filters.manufacturer = req.query.manufacturer as string;
      if (req.query.supplier) filters.supplier = req.query.supplier as string;
      if (req.query.requiresPrescription) filters.requiresPrescription = req.query.requiresPrescription === 'true';
      if (req.query.isDangerous) filters.isDangerous = req.query.isDangerous === 'true';
      if (req.query.lowStock) filters.lowStock = req.query.lowStock === 'true';
      if (req.query.search) filters.search = req.query.search as string;

      const result = await productService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Products retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const product = await productService.getById(req.params.id);
      return ApiResponseUtil.success(res, product, 'Product retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const product = await productService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, product, 'Product created successfully');
    } catch (error: any) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('cannot be greater')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const product = await productService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, product, 'Product updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (
        error.message.includes('already exists') ||
        error.message.includes('cannot be greater')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const result = await productService.delete(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Product deleted successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Cannot delete')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async updateStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { status } = req.body;

      if (!status || !Object.values(ProductStatus).includes(status)) {
        return ApiResponseUtil.badRequest(res, 'Invalid status value');
      }

      const product = await productService.updateStatus(req.params.id, status, req.user.userId);
      return ApiResponseUtil.success(res, product, 'Product status updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await productService.getStatistics();
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async search(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query || query.trim().length < 2) {
        return ApiResponseUtil.badRequest(res, 'Search query must be at least 2 characters');
      }

      const products = await productService.search(query, limit);
      return ApiResponseUtil.success(res, products, 'Search completed successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getLowStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const products = await productService.getLowStockProducts();
      return ApiResponseUtil.success(res, products, 'Low stock products retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getByBarcode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { barcode } = req.params;
      const product = await productService.getByBarcode(barcode);
      return ApiResponseUtil.success(res, product, 'Product retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async bulkCreate(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { products } = req.body;

      if (!products || !Array.isArray(products) || products.length === 0) {
        return ApiResponseUtil.badRequest(res, 'Products array is required');
      }

      const result = await productService.bulkCreate(products, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Bulk creation completed');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async generateBarcode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const product = await productService.generateBarcode(req.params.id);
      return ApiResponseUtil.success(res, product, 'Barcode generated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('already has')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
