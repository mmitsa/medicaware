import { Response } from 'express';
import { UserService, UserFilters } from '../../application/services/user.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { MESSAGES } from '../../shared/constants';
import { UserRole, UserStatus } from '@prisma/client';

const userService = new UserService();

export class UserController {
  /**
   * Get all users with pagination and filters
   * GET /api/v1/users
   */
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filters: UserFilters = {};

      if (req.query.role) {
        filters.role = req.query.role as UserRole;
      }

      if (req.query.status) {
        filters.status = req.query.status as UserStatus;
      }

      if (req.query.warehouseId) {
        filters.warehouseId = req.query.warehouseId as string;
      }

      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      const result = await userService.getAll(page, limit, filters);

      return ApiResponseUtil.success(res, result, 'Users retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const user = await userService.getById(id);

      return ApiResponseUtil.success(res, user, 'User retrieved successfully');
    } catch (error: any) {
      if (error.message === 'User not found' || error.message === 'Invalid user ID format') {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Create new user
   * POST /api/v1/users
   */
  async create(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const data = req.body;

      const user = await userService.create(data, req.user.userId);

      return ApiResponseUtil.created(res, user, 'User created successfully');
    } catch (error: any) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('Invalid') ||
        error.message.includes('Missing required fields')
      ) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  async update(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const { id } = req.params;
      const data = req.body;

      const user = await userService.update(id, data, req.user.userId);

      return ApiResponseUtil.success(res, user, MESSAGES.UPDATED);
    } catch (error: any) {
      if (error.message === 'User not found' || error.message === 'Invalid user ID format') {
        return ApiResponseUtil.notFound(res, error.message);
      }
      if (error.message.includes('already exists') || error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Delete user (soft delete)
   * DELETE /api/v1/users/:id
   */
  async delete(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const { id } = req.params;

      // Prevent user from deleting themselves
      if (id === req.user.userId) {
        return ApiResponseUtil.badRequest(res, 'Cannot delete your own account');
      }

      const result = await userService.delete(id, req.user.userId);

      return ApiResponseUtil.success(res, result, MESSAGES.DELETED);
    } catch (error: any) {
      if (error.message === 'User not found' || error.message === 'Invalid user ID format') {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Update user status
   * PATCH /api/v1/users/:id/status
   */
  async updateStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(UserStatus).includes(status)) {
        return ApiResponseUtil.badRequest(res, 'Invalid status value');
      }

      // Prevent user from changing their own status
      if (id === req.user.userId) {
        return ApiResponseUtil.badRequest(res, 'Cannot change your own status');
      }

      const user = await userService.updateStatus(id, status, req.user.userId);

      return ApiResponseUtil.success(res, user, 'User status updated successfully');
    } catch (error: any) {
      if (error.message === 'Invalid user ID format') {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/users/statistics
   */
  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await userService.getStatistics();

      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Search users
   * GET /api/v1/users/search
   */
  async search(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query) {
        return ApiResponseUtil.badRequest(res, 'Search query is required');
      }

      const users = await userService.search(query, limit);

      return ApiResponseUtil.success(res, users, 'Search completed successfully');
    } catch (error: any) {
      if (error.message.includes('at least')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Get current user profile
   * GET /api/v1/users/me
   */
  async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const user = await userService.getById(req.user.userId);

      return ApiResponseUtil.success(res, user, 'Profile retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  /**
   * Update current user profile
   * PUT /api/v1/users/me
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const data = req.body;

      // Users can only update their own basic info
      const allowedFields = ['firstName', 'lastName', 'phone'];
      const filteredData: any = {};

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          filteredData[field] = data[field];
        }
      });

      const user = await userService.update(req.user.userId, filteredData, req.user.userId);

      return ApiResponseUtil.success(res, user, 'Profile updated successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
