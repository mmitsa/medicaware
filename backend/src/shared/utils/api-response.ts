import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export class ApiResponseUtil {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  static error(res: Response, error: string, message?: string, statusCode: number = 400): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message: string = 'Resource created successfully'): Response {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static badRequest(res: Response, error: string, message: string = 'Bad Request'): Response {
    return this.error(res, error, message, 400);
  }

  static unauthorized(res: Response, error: string = 'Unauthorized', message: string = 'Authentication required'): Response {
    return this.error(res, error, message, 401);
  }

  static forbidden(res: Response, error: string = 'Forbidden', message: string = 'Access denied'): Response {
    return this.error(res, error, message, 403);
  }

  static notFound(res: Response, error: string = 'Not Found', message: string = 'Resource not found'): Response {
    return this.error(res, error, message, 404);
  }

  static conflict(res: Response, error: string, message: string = 'Conflict'): Response {
    return this.error(res, error, message, 409);
  }

  static internalError(res: Response, error: string = 'Internal Server Error', message?: string): Response {
    return this.error(res, error, message, 500);
  }
}
