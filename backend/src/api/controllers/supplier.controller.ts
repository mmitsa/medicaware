import { Response } from 'express';
import { SupplierService } from '../../application/services/supplier.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';

const supplierService = new SupplierService();

export class SupplierController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
      if (req.query.rating) filters.rating = parseFloat(req.query.rating as string);

      const result = await supplierService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Suppliers retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const supplier = await supplierService.getById(req.params.id);
      return ApiResponseUtil.success(res, supplier, 'Supplier retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getByCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const supplier = await supplierService.getByCode(req.params.code);
      return ApiResponseUtil.success(res, supplier, 'Supplier retrieved successfully');
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

      const supplier = await supplierService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, supplier, 'Supplier created successfully');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const supplier = await supplierService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, supplier, 'Supplier updated successfully');
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

      const result = await supplierService.delete(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Supplier deleted successfully');
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

  async activate(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const supplier = await supplierService.activate(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, supplier, 'Supplier activated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async deactivate(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const supplier = await supplierService.deactivate(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, supplier, 'Supplier deactivated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async updateRating(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const { rating } = req.body;
      if (rating === undefined) {
        return ApiResponseUtil.badRequest(res, 'Rating is required');
      }

      const supplier = await supplierService.updateRating(req.params.id, rating, req.user.userId);
      return ApiResponseUtil.success(res, supplier, 'Supplier rating updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('must be')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getPurchaseHistory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (req.query.dateFrom) dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) dateTo = new Date(req.query.dateTo as string);

      const history = await supplierService.getSupplierPurchaseHistory(
        req.params.id,
        dateFrom,
        dateTo
      );

      return ApiResponseUtil.success(res, history, 'Purchase history retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getPerformance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const performance = await supplierService.getSupplierPerformance(req.params.id);
      return ApiResponseUtil.success(res, performance, 'Supplier performance retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await supplierService.getStatistics();
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
