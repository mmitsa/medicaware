import { Request, Response } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';
import { MESSAGES } from '../../shared/constants';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ApiResponseUtil.badRequest(res, 'Email and password are required');
      }

      const result = await authService.login({ email, password });

      return ApiResponseUtil.success(res, result, MESSAGES.LOGIN_SUCCESS);
    } catch (error: any) {
      return ApiResponseUtil.badRequest(res, error.message, MESSAGES.INVALID_CREDENTIALS);
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ApiResponseUtil.badRequest(res, 'Refresh token is required');
      }

      const tokens = await authService.refreshToken(refreshToken);

      return ApiResponseUtil.success(res, tokens, 'Token refreshed successfully');
    } catch (error: any) {
      return ApiResponseUtil.unauthorized(res, error.message);
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      await authService.logout(req.user.userId);

      return ApiResponseUtil.success(res, null, MESSAGES.LOGOUT_SUCCESS);
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async register(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const data = req.body;

      if (!data.email || !data.username || !data.password || !data.firstName || !data.lastName || !data.role) {
        return ApiResponseUtil.badRequest(res, 'Missing required fields');
      }

      const user = await authService.register(data, req.user.userId);

      return ApiResponseUtil.created(res, user, 'User registered successfully');
    } catch (error: any) {
      return ApiResponseUtil.badRequest(res, error.message);
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return ApiResponseUtil.badRequest(res, 'Old password and new password are required');
      }

      await authService.changePassword(req.user.userId, oldPassword, newPassword);

      return ApiResponseUtil.success(res, null, 'Password changed successfully');
    } catch (error: any) {
      return ApiResponseUtil.badRequest(res, error.message);
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return ApiResponseUtil.badRequest(res, 'Email is required');
      }

      const result = await authService.requestPasswordReset(email);

      return ApiResponseUtil.success(res, null, result.message);
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        return ApiResponseUtil.badRequest(res, 'Reset token and new password are required');
      }

      await authService.resetPassword(resetToken, newPassword);

      return ApiResponseUtil.success(res, null, 'Password reset successfully');
    } catch (error: any) {
      return ApiResponseUtil.badRequest(res, error.message);
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res);
      }

      // In a real app, fetch full user data from database
      return ApiResponseUtil.success(res, req.user, 'Profile retrieved successfully');
    } catch (error: any) {
      return ApiResponseUtil.internalError(res, error.message);
    }
  }
}
