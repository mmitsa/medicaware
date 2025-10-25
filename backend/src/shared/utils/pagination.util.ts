import { PaginationParams, PaginatedResponse } from '../types';
import { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } from '../constants';

export class PaginationUtil {
  static getParams(page?: number, limit?: number): PaginationParams {
    const parsedPage = page && page > 0 ? page : DEFAULT_PAGE;
    const parsedLimit = limit && limit > 0 && limit <= MAX_LIMIT ? limit : DEFAULT_LIMIT;
    const skip = (parsedPage - 1) * parsedLimit;

    return {
      page: parsedPage,
      limit: parsedLimit,
      skip,
    };
  }

  static createResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
