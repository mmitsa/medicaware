import { Response } from 'express';
import { FinancialService, PaymentMethod, PaymentStatus } from '../../application/services/financial.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';

const financialService = new FinancialService();

export class FinancialController {
  /**
   * Payment Management
   */

  async createPayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const payment = await financialService.createPayment(req.body, req.user.userId);
      return ApiResponseUtil.created(res, payment, 'Payment recorded successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('exceeds') || error.message.includes('must be')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getPaymentById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const payment = await financialService.getPaymentById(req.params.id);
      return ApiResponseUtil.success(res, payment, 'Payment retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getAllPayments(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.supplierId) filters.supplierId = req.query.supplierId as string;
      if (req.query.paymentMethod) filters.paymentMethod = req.query.paymentMethod as PaymentMethod;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

      const result = await financialService.getAllPayments(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Payments retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getPaymentsByPurchaseOrder(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const result = await financialService.getPaymentsByPurchaseOrder(req.params.purchaseOrderId);
      return ApiResponseUtil.success(res, result, 'Purchase order payments retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async deletePayment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const result = await financialService.deletePayment(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Payment deleted successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Accounts Payable
   */

  async getAccountsPayable(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const filters: any = {};

      if (req.query.supplierId) filters.supplierId = req.query.supplierId as string;
      if (req.query.status) filters.status = req.query.status as PaymentStatus;
      if (req.query.overdueDays) filters.overdueDays = parseInt(req.query.overdueDays as string);

      const result = await financialService.getAccountsPayable(filters);
      return ApiResponseUtil.success(res, result, 'Accounts payable retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getSupplierBalance(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const balance = await financialService.getSupplierBalance(req.params.supplierId);
      return ApiResponseUtil.success(res, balance, 'Supplier balance retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Financial Reports
   */

  async getPaymentReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (req.query.dateFrom) dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) dateTo = new Date(req.query.dateTo as string);

      const report = await financialService.getPaymentReport(dateFrom, dateTo);
      return ApiResponseUtil.success(res, report, 'Payment report generated successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getCashFlowReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (req.query.dateFrom) dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) dateTo = new Date(req.query.dateTo as string);

      const report = await financialService.getCashFlowReport(dateFrom, dateTo);
      return ApiResponseUtil.success(res, report, 'Cash flow report generated successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getFinancialSummary(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const summary = await financialService.getFinancialSummary();
      return ApiResponseUtil.success(res, summary, 'Financial summary retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
