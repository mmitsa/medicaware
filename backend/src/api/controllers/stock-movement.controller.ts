import { Response } from 'express';
import { StockMovementService } from '../../application/services/stock-movement.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { MovementType } from '@prisma/client';

const stockMovementService = new StockMovementService();

export class StockMovementController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.type) filters.type = req.query.type as MovementType;
      if (req.query.productId) filters.productId = req.query.productId as string;
      if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId as string;
      if (req.query.batchId) filters.batchId = req.query.batchId as string;
      if (req.query.userId) filters.userId = req.query.userId as string;
      if (req.query.referenceType) filters.referenceType = req.query.referenceType as string;
      if (req.query.referenceId) filters.referenceId = req.query.referenceId as string;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

      const result = await stockMovementService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Stock movements retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const movement = await stockMovementService.getById(req.params.id);
      return ApiResponseUtil.success(res, movement, 'Stock movement retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getByProduct(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const movements = await stockMovementService.getByProduct(req.params.productId, limit);
      return ApiResponseUtil.success(res, movements, 'Product movements retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getByWarehouse(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const result = await stockMovementService.getByWarehouse(req.params.warehouseId, dateFrom, dateTo);
      return ApiResponseUtil.success(res, result, 'Warehouse movements retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async createReceipt(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const movement = await stockMovementService.createReceipt(req.body, req.user.userId);
      return ApiResponseUtil.created(res, movement, 'Receipt created successfully');
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

  async createIssue(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const movement = await stockMovementService.createIssue(req.body, req.user.userId);
      return ApiResponseUtil.created(res, movement, 'Issue created successfully');
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

  async createReturn(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const movement = await stockMovementService.createReturn(req.body, req.user.userId);
      return ApiResponseUtil.created(res, movement, 'Return created successfully');
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

  async createExpired(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const movement = await stockMovementService.createExpired(req.body, req.user.userId);
      return ApiResponseUtil.created(res, movement, 'Expired stock recorded successfully');
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

  async createDamaged(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const movement = await stockMovementService.createDamaged(req.body, req.user.userId);
      return ApiResponseUtil.created(res, movement, 'Damaged stock recorded successfully');
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

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await stockMovementService.getStatistics(dateFrom, dateTo);
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const warehouseId = req.query.warehouseId as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const report = await stockMovementService.getReport(warehouseId, dateFrom, dateTo);
      return ApiResponseUtil.success(res, report, 'Report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
