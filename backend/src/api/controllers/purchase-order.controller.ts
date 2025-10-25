import { Response } from 'express';
import { PurchaseOrderService } from '../../application/services/purchase-order.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { PurchaseOrderStatus } from '@prisma/client';

const purchaseOrderService = new PurchaseOrderService();

export class PurchaseOrderController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.status) filters.status = req.query.status as PurchaseOrderStatus;
      if (req.query.supplier) filters.supplier = req.query.supplier as string;
      if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId as string;
      if (req.query.createdById) filters.createdById = req.query.createdById as string;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

      const result = await purchaseOrderService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Purchase orders retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const order = await purchaseOrderService.getById(req.params.id);
      return ApiResponseUtil.success(res, order, 'Purchase order retrieved successfully');
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
      const order = await purchaseOrderService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, order, 'Purchase order created successfully');
    } catch (error: any) {
      if (
        error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('not found') ||
        error.message.includes('required') ||
        error.message.includes('must be')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const order = await purchaseOrderService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Purchase order updated successfully');
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

  async submit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const order = await purchaseOrderService.submit(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Purchase order submitted successfully');
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
      const order = await purchaseOrderService.approve(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Purchase order approved successfully');
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

  async placeOrder(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);
      const order = await purchaseOrderService.placeOrder(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, order, 'Order placed with supplier successfully');
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
      const { receivedItems } = req.body;

      if (!receivedItems || typeof receivedItems !== 'object') {
        return ApiResponseUtil.badRequest(res, 'Received items data is required');
      }

      const order = await purchaseOrderService.receive(req.params.id, req.user.userId, receivedItems);
      return ApiResponseUtil.success(res, order, 'Purchase order received successfully');
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
      const order = await purchaseOrderService.cancel(req.params.id, req.user.userId, reason);
      return ApiResponseUtil.success(res, order, 'Purchase order cancelled successfully');
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

      const stats = await purchaseOrderService.getStatistics(dateFrom, dateTo);
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
