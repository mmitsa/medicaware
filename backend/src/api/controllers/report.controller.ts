import { Response } from 'express';
import { ReportService } from '../../application/services/report.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';

const reportService = new ReportService();

export class ReportController {
  /**
   * Stock Reports
   */

  async getStockLevelsReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const filters: any = {};

      if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId as string;
      if (req.query.productId) filters.productId = req.query.productId as string;
      if (req.query.categoryId) filters.categoryId = req.query.categoryId as string;
      if (req.query.status) filters.status = req.query.status as any;

      const report = await reportService.getStockLevelsReport(filters);
      return ApiResponseUtil.success(res, report, 'Stock levels report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getLowStockReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const warehouseId = req.query.warehouseId as string | undefined;
      const report = await reportService.getLowStockReport(warehouseId);

      return ApiResponseUtil.success(res, report, 'Low stock report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getExpiryReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const daysAhead = parseInt(req.query.daysAhead as string) || 90;
      const warehouseId = req.query.warehouseId as string | undefined;

      const report = await reportService.getExpiryReport(daysAhead, warehouseId);
      return ApiResponseUtil.success(res, report, 'Expiry report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStockValuationReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const warehouseId = req.query.warehouseId as string | undefined;
      const report = await reportService.getStockValuationReport(warehouseId);

      return ApiResponseUtil.success(res, report, 'Stock valuation report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Movement Reports
   */

  async getStockMovementReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const filters: any = {};

      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
      if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId as string;
      if (req.query.productId) filters.productId = req.query.productId as string;
      if (req.query.type) filters.type = req.query.type as string;

      const report = await reportService.getStockMovementReport(filters);
      return ApiResponseUtil.success(res, report, 'Stock movement report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Transfer Order Reports
   */

  async getTransferOrderReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const filters: any = {};

      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
      if (req.query.fromWarehouseId) filters.fromWarehouseId = req.query.fromWarehouseId as string;
      if (req.query.toWarehouseId) filters.toWarehouseId = req.query.toWarehouseId as string;
      if (req.query.status) filters.status = req.query.status as string;

      const report = await reportService.getTransferOrderReport(filters);
      return ApiResponseUtil.success(res, report, 'Transfer order report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Purchase Order Reports
   */

  async getPurchaseOrderReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const filters: any = {};

      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
      if (req.query.supplierId) filters.supplierId = req.query.supplierId as string;
      if (req.query.status) filters.status = req.query.status as string;

      const report = await reportService.getPurchaseOrderReport(filters);
      return ApiResponseUtil.success(res, report, 'Purchase order report generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Product Analytics
   */

  async getProductAnalytics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const filters: any = {};

      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
      if (req.query.warehouseId) filters.warehouseId = req.query.warehouseId as string;
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string);

      const report = await reportService.getProductAnalytics(filters);
      return ApiResponseUtil.success(res, report, 'Product analytics generated successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Dashboard Summary
   */

  async getDashboardSummary(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const warehouseId = req.query.warehouseId as string | undefined;
      const summary = await reportService.getDashboardSummary(warehouseId);

      return ApiResponseUtil.success(res, summary, 'Dashboard summary retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
