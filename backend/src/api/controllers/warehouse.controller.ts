import { Response } from 'express';
import { WarehouseService } from '../../application/services/warehouse.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { WarehouseType } from '@prisma/client';

const warehouseService = new WarehouseService();

export class WarehouseController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.type) filters.type = req.query.type as WarehouseType;
      if (req.query.city) filters.city = req.query.city as string;
      if (req.query.region) filters.region = req.query.region as string;
      if (req.query.isActive) filters.isActive = req.query.isActive === 'true';
      if (req.query.search) filters.search = req.query.search as string;

      const result = await warehouseService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Warehouses retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const warehouse = await warehouseService.getById(req.params.id);
      return ApiResponseUtil.success(res, warehouse, 'Warehouse retrieved successfully');
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
      const warehouse = await warehouseService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, warehouse, 'Warehouse created successfully');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('Missing') || error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const warehouse = await warehouseService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, warehouse, 'Warehouse updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('already exists')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const result = await warehouseService.delete(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Warehouse deleted successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async createZone(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const zone = await warehouseService.createZone(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.created(res, zone, 'Zone created successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('already exists')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async createShelf(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const shelf = await warehouseService.createShelf(req.params.zoneId, req.body);
      return ApiResponseUtil.created(res, shelf, 'Shelf created successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('already exists')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await warehouseService.getStatistics();
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
