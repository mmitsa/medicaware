import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ApiResponseUtil } from '../../shared/utils/api-response';
import { AuthRequest } from '../../shared/types';

export const roleMiddleware = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return ApiResponseUtil.unauthorized(res);
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return ApiResponseUtil.forbidden(
        res,
        'Access denied',
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

// Predefined role middleware
export const requireAdmin = roleMiddleware(UserRole.SUPER_ADMIN, UserRole.ADMIN);
export const requireWarehouseManager = roleMiddleware(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.WAREHOUSE_MANAGER
);
export const requirePharmacist = roleMiddleware(
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.WAREHOUSE_MANAGER,
  UserRole.PHARMACIST
);
