import { Response } from 'express';
import { CategoryService } from '../../application/services/category.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';

const categoryService = new CategoryService();

export class CategoryController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
      if (req.query.parentId !== undefined) filters.parentId = req.query.parentId as string;

      const result = await categoryService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Categories retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const category = await categoryService.getById(req.params.id);
      return ApiResponseUtil.success(res, category, 'Category retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getByCode(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const category = await categoryService.getByCode(req.params.code);
      return ApiResponseUtil.success(res, category, 'Category retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getTree(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const tree = await categoryService.getTree();
      return ApiResponseUtil.success(res, tree, 'Category tree retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async create(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const category = await categoryService.create(req.body, req.user.userId);
      return ApiResponseUtil.created(res, category, 'Category created successfully');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const category = await categoryService.update(req.params.id, req.body, req.user.userId);
      return ApiResponseUtil.success(res, category, 'Category updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid') ||
          error.message.includes('cannot') || error.message.includes('Cannot')) {
        return ApiResponseUtil.badRequest(res, error.message);
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

      const result = await categoryService.delete(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Category deleted successfully');
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

      const category = await categoryService.activate(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, category, 'Category activated successfully');
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

      const category = await categoryService.deactivate(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, category, 'Category deactivated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getProducts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await categoryService.getCategoryProducts(req.params.id, page, limit);
      return ApiResponseUtil.success(res, result, 'Category products retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await categoryService.getStatistics();
      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
