import { Response } from 'express';
import { StockCountService } from '../../application/services/stock-count.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { StockCountStatus } from '@prisma/client';

const stockCountService = new StockCountService();

export class StockCountController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.status) filters.status = req.query.status as StockCountStatus;
      if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId as string;
      if (req.query.createdById) filters.createdById = req.query.createdById as string;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

      const result = await stockCountService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Stock counts retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const count = await stockCountService.getById(req.params.id);
      return ApiResponseUtil.success(res, count, 'Stock count retrieved successfully');
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
      const count = await stockCountService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, count, 'Stock count created successfully');
    } catch (error: any) {
      if (
        error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('not found') ||
        error.message.includes('cannot')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const count = await stockCountService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, count, 'Stock count updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async start(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const count = await stockCountService.start(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, count, 'Stock count started successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async recordCounts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { countedItems } = req.body;

      if (!countedItems || !Array.isArray(countedItems)) {
        return ApiResponseUtil.badRequest(res, 'Counted items array is required');
      }

      const count = await stockCountService.recordCounts(req.params.id, countedItems, req.user.userId);
      return ApiResponseUtil.success(res, count, 'Counts recorded successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only') || error.message.includes('cannot')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async complete(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const count = await stockCountService.complete(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, count, 'Stock count completed successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only') || error.message.includes('have not been')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async approve(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const count = await stockCountService.approve(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, count, 'Stock count approved and adjustments applied');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async cancel(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { reason } = req.body;
      const count = await stockCountService.cancel(req.params.id, req.user.userId, reason);
      return ApiResponseUtil.success(res, count, 'Stock count cancelled successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Cannot')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getVarianceReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const report = await stockCountService.getVarianceReport(req.params.id);
      return ApiResponseUtil.success(res, report, 'Variance report retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await stockCountService.getStatistics(dateFrom, dateTo);
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
