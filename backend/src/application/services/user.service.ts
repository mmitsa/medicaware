import { PrismaClient, UserRole, UserStatus, User } from '@prisma/client';
import { PasswordUtil } from '../../shared/utils/password.util';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  warehouseId?: string;
  search?: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  warehouseId?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  hireDate?: Date;
  permissions?: any;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  warehouseId?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  hireDate?: Date;
  permissions?: any;
}

export class UserService {
  /**
   * Get all users with pagination and filters
   */
  async getAll(page: number = 1, limit: number = 20, filters?: UserFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { employeeId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Fetch users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parsedLimit,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          warehouseId: true,
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              nameAr: true,
              type: true,
            },
          },
          employeeId: true,
          department: true,
          position: true,
          hireDate: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    return PaginationUtil.createResponse(users, total, page, parsedLimit);
  }

  /**
   * Get user by ID
   */
  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) {
      throw new Error('Invalid user ID format');
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            type: true,
            city: true,
            region: true,
          },
        },
        employeeId: true,
        department: true,
        position: true,
        hireDate: true,
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Create new user
   */
  async create(data: CreateUserData, createdBy: string) {
    // Validate required fields
    const validation = ValidationUtil.validateRequiredFields(data, [
      'email',
      'username',
      'password',
      'firstName',
      'lastName',
      'role',
    ]);

    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Validate email format
    if (!ValidationUtil.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone if provided
    if (data.phone && !ValidationUtil.isValidPhone(data.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: data.email,
        deletedAt: null,
      },
    });

    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: data.username,
        deletedAt: null,
      },
    });

    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // Validate password
    const passwordValidation = PasswordUtil.validate(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        status: data.status || UserStatus.ACTIVE,
        createdBy,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            type: true,
          },
        },
        employeeId: true,
        department: true,
        position: true,
        hireDate: true,
        createdAt: true,
      },
    });

    logger.info(`User created: ${user.email} by ${createdBy}`);

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData, updatedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) {
      throw new Error('Invalid user ID format');
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Validate email if being updated
    if (data.email) {
      if (!ValidationUtil.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      const emailExists = await prisma.user.findFirst({
        where: {
          email: data.email,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (emailExists) {
        throw new Error('Email already exists');
      }
    }

    // Validate username if being updated
    if (data.username) {
      const usernameExists = await prisma.user.findFirst({
        where: {
          username: data.username,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (usernameExists) {
        throw new Error('Username already exists');
      }
    }

    // Validate phone if provided
    if (data.phone && !ValidationUtil.isValidPhone(data.phone)) {
      throw new Error('Invalid phone number format');
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedBy,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        warehouseId: true,
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            type: true,
          },
        },
        employeeId: true,
        department: true,
        position: true,
        hireDate: true,
        permissions: true,
        updatedAt: true,
      },
    });

    logger.info(`User updated: ${user.email} by ${updatedBy}`);

    return user;
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string, deletedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) {
      throw new Error('Invalid user ID format');
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
        status: UserStatus.INACTIVE,
      },
    });

    logger.info(`User deleted: ${user.email} by ${deletedBy}`);

    return { message: 'User deleted successfully' };
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus, updatedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) {
      throw new Error('Invalid user ID format');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        status,
        updatedBy,
      },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });

    logger.info(`User status updated: ${user.email} to ${status} by ${updatedBy}`);

    return user;
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    const [total, active, inactive, suspended, byRole] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { status: UserStatus.ACTIVE, deletedAt: null } }),
      prisma.user.count({ where: { status: UserStatus.INACTIVE, deletedAt: null } }),
      prisma.user.count({ where: { status: UserStatus.SUSPENDED, deletedAt: null } }),
      prisma.user.groupBy({
        by: ['role'],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    const roleStats = byRole.reduce((acc: any, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {});

    return {
      total,
      active,
      inactive,
      suspended,
      byRole: roleStats,
    };
  }

  /**
   * Search users
   */
  async search(query: string, limit: number = 10) {
    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
          { employeeId: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        employeeId: true,
        department: true,
      },
      take: limit,
    });

    return users;
  }
}
