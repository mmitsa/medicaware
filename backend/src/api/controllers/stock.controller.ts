import { Response } from 'express';
import { StockService } from '../../application/services/stock.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';

const stockService = new StockService();

export class StockController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.productId) filters.productId = req.query.productId as string;
      if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId as string;
      if (req.query.zoneId) filters.zoneId = req.query.zoneId as string;
      if (req.query.shelfId) filters.shelfId = req.query.shelfId as string;
      if (req.query.batchId) filters.batchId = req.query.batchId as string;
      if (req.query.lowStock) filters.lowStock = req.query.lowStock === 'true';
      if (req.query.outOfStock) filters.outOfStock = req.query.outOfStock === 'true';
      if (req.query.hasReserved) filters.hasReserved = req.query.hasReserved === 'true';

      const result = await stockService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Stock records retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stock = await stockService.getById(req.params.id);
      return ApiResponseUtil.success(res, stock, 'Stock record retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getByProduct(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const result = await stockService.getByProduct(req.params.productId);
      return ApiResponseUtil.success(res, result, 'Product stock retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getByWarehouse(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const result = await stockService.getByWarehouse(req.params.warehouseId);
      return ApiResponseUtil.success(res, result, 'Warehouse stock retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getLowStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const items = await stockService.getLowStock();
      return ApiResponseUtil.success(res, items, 'Low stock items retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getOutOfStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const items = await stockService.getOutOfStock();
      return ApiResponseUtil.success(res, items, 'Out of stock items retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async adjustStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const result = await stockService.adjustStock(req.body, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Stock adjusted successfully');
    } catch (error: any) {
      if (
        error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('not found') ||
        error.message.includes('negative')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async reserveStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { productId, warehouseId, quantity, batchId } = req.body;

      if (!productId || !warehouseId || !quantity) {
        return ApiResponseUtil.badRequest(res, 'Product ID, warehouse ID, and quantity are required');
      }

      const stock = await stockService.reserveStock(productId, warehouseId, quantity, batchId);
      return ApiResponseUtil.success(res, stock, 'Stock reserved successfully');
    } catch (error: any) {
      if (
        error.message.includes('Invalid') ||
        error.message.includes('not found') ||
        error.message.includes('Insufficient') ||
        error.message.includes('must be')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async releaseReservedStock(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { productId, warehouseId, quantity, batchId } = req.body;

      if (!productId || !warehouseId || !quantity) {
        return ApiResponseUtil.badRequest(res, 'Product ID, warehouse ID, and quantity are required');
      }

      const stock = await stockService.releaseReservedStock(productId, warehouseId, quantity, batchId);
      return ApiResponseUtil.success(res, stock, 'Reserved stock released successfully');
    } catch (error: any) {
      if (
        error.message.includes('Invalid') ||
        error.message.includes('not found') ||
        error.message.includes('Cannot release') ||
        error.message.includes('must be')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await stockService.getStatistics();
      return ApiResponseUtil.success(res, stats, 'Stock statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
