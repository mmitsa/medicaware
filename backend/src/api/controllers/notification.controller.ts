import { Response } from 'express';
import { NotificationService } from '../../application/services/notification.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { NotificationStatus, NotificationType } from '@prisma/client';

const notificationService = new NotificationService();

export class NotificationController {
  async getAll(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters: any = {};

      if (req.query.type) filters.type = req.query.type as NotificationType;
      if (req.query.status) filters.status = req.query.status as NotificationStatus;
      if (req.query.userId) filters.userId = req.query.userId as string;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

      const result = await notificationService.getAll(page, limit, filters);
      return ApiResponseUtil.success(res, result, 'Notifications retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const notification = await notificationService.getById(req.params.id);
      return ApiResponseUtil.success(res, notification, 'Notification retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getUserNotifications(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const userId = req.params.userId || req.user.userId;
      const status = req.query.status as NotificationStatus | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const notifications = await notificationService.getUserNotifications(userId, status, limit);
      return ApiResponseUtil.success(res, notifications, 'User notifications retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const userId = req.params.userId || req.user.userId;
      const count = await notificationService.getUnreadCount(userId);

      return ApiResponseUtil.success(res, { count }, 'Unread count retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const notification = await notificationService.markAsRead(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, notification, 'Notification marked as read');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const result = await notificationService.markAllAsRead(req.user.userId);
      return ApiResponseUtil.success(res, result, 'All notifications marked as read');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async archive(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const notification = await notificationService.archive(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, notification, 'Notification archived successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const result = await notificationService.delete(req.params.id, req.user.userId);
      return ApiResponseUtil.success(res, result, 'Notification deleted successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Invalid')) {
        return ApiResponseUtil.notFound(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async deleteAllRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) return ApiResponseUtil.unauthorized(res);

      const result = await notificationService.deleteAllRead(req.user.userId);
      return ApiResponseUtil.success(res, result, 'All read notifications deleted successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async getStatistics(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.query.userId as string | undefined;
      const stats = await notificationService.getStatistics(userId);

      return ApiResponseUtil.success(res, stats, 'Statistics retrieved successfully');
    } catch (error: any) {
      if (error.message.includes('Invalid')) {
        return ApiResponseUtil.badRequest(res, error.message);
      }
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
