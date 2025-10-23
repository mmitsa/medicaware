import { PrismaClient, UserStatus } from '@prisma/client';
import { PasswordUtil } from '../shared/utils/password.util';
import { JwtUtil, TokenPayload } from '../shared/utils/jwt.util';
import logger from '../shared/utils/logger';

const prisma = new PrismaClient();

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  warehouseId?: string;
}

export class AuthService {
  async login(credentials: LoginCredentials) {
    const { email, password } = credentials;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }],
        deletedAt: null,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('User account is not active');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      warehouseId: user.warehouseId || undefined,
    };

    const tokens = JwtUtil.generateTokens(tokenPayload);

    // Update last login and refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshToken: tokens.refreshToken,
      },
    });

    // Log login
    logger.info(`User logged in: ${user.email}`);

    // Return user data without password
    const { password: _, refreshToken: __, ...userData } = user;

    return {
      user: userData,
      tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = JwtUtil.verifyRefreshToken(refreshToken);

      // Find user and verify refresh token
      const user = await prisma.user.findFirst({
        where: {
          id: payload.userId,
          refreshToken,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
      });

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        warehouseId: user.warehouseId || undefined,
      };

      const tokens = JwtUtil.generateTokens(tokenPayload);

      // Update refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken: tokens.refreshToken,
        },
      });

      return tokens;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    // Clear refresh token
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });

    logger.info(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
  }

  async register(data: RegisterData, createdBy: string) {
    // Validate password
    const passwordValidation = PasswordUtil.validate(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Check if email exists
    const existingEmail = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Check if username exists
    const existingUsername = await prisma.user.findFirst({
      where: { username: data.username, deletedAt: null },
    });

    if (existingUsername) {
      throw new Error('Username already exists');
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        createdBy,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    logger.info(`User registered: ${user.email} by ${createdBy}`);

    // Return user without password
    const { password: _, ...userData } = user;

    return userData;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await PasswordUtil.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      throw new Error('Invalid old password');
    }

    // Validate new password
    const passwordValidation = PasswordUtil.validate(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await PasswordUtil.hash(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null, // Clear refresh token to force re-login
      },
    });

    logger.info(`Password changed for user: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(email: string) {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link will be sent' };
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp: resetTokenExpiry,
      },
    });

    // TODO: Send email with reset link
    logger.info(`Password reset requested for: ${email}`);

    return { message: 'If the email exists, a reset link will be sent' };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken,
        resetTokenExp: {
          gte: new Date(),
        },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate new password
    const passwordValidation = PasswordUtil.validate(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await PasswordUtil.hash(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
        refreshToken: null,
      },
    });

    logger.info(`Password reset completed for user: ${user.id}`);

    return { message: 'Password reset successfully' };
  }
}
