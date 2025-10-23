import { Response } from 'express';
import { BatchService } from '../../application/services/batch.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';

const batchService = new BatchService();

export class BatchController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.productId) filters.productId = req.query.productId as string;
      if (req.query.isExpired) filters.isExpired = req.query.isExpired === 'true';
      if (req.query.isRecalled) filters.isRecalled = req.query.isRecalled === 'true';
      if (req.query.expiringWithinDays) filters.expiringWithinDays = parseInt(req.query.expiringWithinDays as string);
      if (req.query.search) filters.search = req.query.search as string;

      const result = await batchService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Batches retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const batch = await batchService.getById(req.params.id);
      return ApiResponseUtil.success(res, batch, 'Batch retrieved successfully');
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
      const batch = await batchService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, batch, 'Batch created successfully');
    } catch (error: any) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('cannot') ||
        error.message.includes('must')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const batch = await batchService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, batch, 'Batch updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (
        error.message.includes('already exists') ||
        error.message.includes('cannot') ||
        error.message.includes('must')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const result = await batchService.delete(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Batch deleted successfully');
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

  async recall(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return ApiResponseUtil.badRequest(res, 'Recall reason is required');
      }

      const batch = await batchService.recall(req.params.id, reason, req.user.userId);
      return ApiResponseUtil.success(res, batch, 'Batch recalled successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('already recalled') || error.message.includes('required')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getExpiringBatches(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const daysAhead = req.query.days ? parseInt(req.query.days as string) : undefined;
      const batches = await batchService.getExpiringBatches(daysAhead);
      return ApiResponseUtil.success(res, batches, 'Expiring batches retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getExpiredBatches(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const batches = await batchService.getExpiredBatches();
      return ApiResponseUtil.success(res, batches, 'Expired batches retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await batchService.getStatistics();
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async markAsExpired(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const result = await batchService.markAsExpired();
      return ApiResponseUtil.success(res, result, 'Expired batches marked successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
