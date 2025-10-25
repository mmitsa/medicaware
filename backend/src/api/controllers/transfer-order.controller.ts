import { Response } from 'express';
import { TransferOrderService } from '../../application/services/transfer-order.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { TransferStatus } from '@prisma/client';

const transferOrderService = new TransferOrderService();

export class TransferOrderController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.status) filters.status = req.query.status as TransferStatus;
      if (req.query.fromWarehouseId) filters.fromWarehouseId = req.query.fromWarehouseId as string;
      if (req.query.toWarehouseId) filters.toWarehouseId = req.query.toWarehouseId as string;
      if (req.query.createdById) filters.createdById = req.query.createdById as string;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

      const result = await transferOrderService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Transfer orders retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const order = await transferOrderService.getById(req.params.id);
      return ApiResponseUtil.success(res, order, 'Transfer order retrieved successfully');
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
      const order = await transferOrderService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, order, 'Transfer order created successfully');
    } catch (error: any) {
      if (
        error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('not found') ||
        error.message.includes('Cannot') ||
        error.message.includes('required')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const order = await transferOrderService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Transfer order updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only') || error.message.includes('Cannot')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async submit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const order = await transferOrderService.submit(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Transfer order submitted for approval');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only') || error.message.includes('Cannot')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async approve(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const order = await transferOrderService.approve(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Transfer order approved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only') || error.message.includes('Insufficient')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async reject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return ApiResponseUtil.badRequest(res, 'Rejection reason is required');
      }

      const order = await transferOrderService.reject(req.params.id, reason, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Transfer order rejected');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('Can only') || error.message.includes('required')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async ship(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const order = await transferOrderService.ship(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Transfer order shipped successfully');
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

  async receive(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const receivedQuantities = req.body.receivedQuantities;
      const order = await transferOrderService.receive(req.params.id, req.user.userId, receivedQuantities);
      return ApiResponseUtil.success(res, order, 'Transfer order received successfully');
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
      const order = await transferOrderService.cancel(req.params.id, req.user.userId, reason);
      return ApiResponseUtil.success(res, order, 'Transfer order cancelled successfully');
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

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const stats = await transferOrderService.getStatistics(dateFrom, dateTo);
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
