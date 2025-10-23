import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { ApiResponseUtil } from '../utils/api-response';
import { AuthRequest } from '../types';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return ApiResponseUtil.unauthorized(res, 'No token provided', 'Authentication required');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return ApiResponseUtil.unauthorized(res, 'Invalid token format', 'Token must be in format: Bearer <token>');
    }

    const token = parts[1];

    try {
      const payload = JwtUtil.verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (error) {
      return ApiResponseUtil.unauthorized(res, 'Invalid or expired token', 'Please login again');
    }
  } catch (error) {
    return ApiResponseUtil.internalError(res, 'Authentication error');
  }
};
