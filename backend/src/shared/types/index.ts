import { Request } from 'express';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    warehouseId?: string;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filters
export interface DateFilter {
  from?: Date;
  to?: Date;
}

export interface SearchFilter {
  query?: string;
  fields?: string[];
}

// Response types
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  timestamp: string;
  details?: any;
}
