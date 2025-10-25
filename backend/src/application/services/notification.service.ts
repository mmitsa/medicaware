import { PrismaClient, NotificationType, NotificationStatus } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';
import { EXPIRY_WARNING_DAYS } from '../../shared/constants';

const prisma = new PrismaClient();

export interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateNotificationData {
  type: NotificationType;
  userId: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: any;
  expiresAt?: Date;
}

export class NotificationService {
  /**
   * Get all notifications with pagination and filtering
   */
  async getAll(page: number = 1, limit: number = 20, filters?: NotificationFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) {
      if (!ValidationUtil.isValidUUID(filters.userId)) {
        throw new Error('Invalid user ID');
      }
      where.userId = filters.userId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where })
    ]);

    return PaginationUtil.createResponse(notifications, total, page, parsedLimit);
  }

  /**
   * Get notification by ID
   */
  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid notification ID');

    const notification = await prisma.notification.findFirst({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!notification) throw new Error('Notification not found');

    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, status?: NotificationStatus, limit: number = 50) {
    if (!ValidationUtil.isValidUUID(userId)) throw new Error('Invalid user ID');

    const where: any = { userId };
    if (status) where.status = status;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return notifications;
  }

  /**
   * Get unread notifications count for user
   */
  async getUnreadCount(userId: string) {
    if (!ValidationUtil.isValidUUID(userId)) throw new Error('Invalid user ID');

    const count = await prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD
      }
    });

    return count;
  }

  /**
   * Create notification
   */
  async create(data: CreateNotificationData) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'type',
      'userId',
      'title',
      'message'
    ]);
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Validate user exists
    if (!ValidationUtil.isValidUUID(data.userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await prisma.user.findFirst({
      where: { id: data.userId, deletedAt: null }
    });
    if (!user) throw new Error('User not found');

    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        userId: data.userId,
        title: data.title,
        titleAr: data.titleAr,
        message: data.message,
        messageAr: data.messageAr,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        metadata: data.metadata,
        expiresAt: data.expiresAt,
        status: NotificationStatus.UNREAD
      }
    });

    logger.info(`Notification created: ${data.type} for user ${user.username}`);
    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid notification ID');

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!notification) throw new Error('Notification not found');

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date()
      }
    });

    return updated;
  }

  /**
   * Mark all user notifications as read
   */
  async markAllAsRead(userId: string) {
    if (!ValidationUtil.isValidUUID(userId)) throw new Error('Invalid user ID');

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date()
      }
    });

    logger.info(`Marked ${result.count} notifications as read for user ${userId}`);
    return result;
  }

  /**
   * Archive notification
   */
  async archive(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid notification ID');

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!notification) throw new Error('Notification not found');

    const updated = await prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.ARCHIVED }
    });

    return updated;
  }

  /**
   * Delete notification
   */
  async delete(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid notification ID');

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!notification) throw new Error('Notification not found');

    await prisma.notification.delete({
      where: { id }
    });

    logger.info(`Notification deleted: ${id} by user ${userId}`);
    return { message: 'Notification deleted successfully' };
  }

  /**
   * Delete all read notifications for user
   */
  async deleteAllRead(userId: string) {
    if (!ValidationUtil.isValidUUID(userId)) throw new Error('Invalid user ID');

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        status: NotificationStatus.READ
      }
    });

    logger.info(`Deleted ${result.count} read notifications for user ${userId}`);
    return result;
  }

  /**
   * Create expiry warning notifications
   */
  async createExpiryWarnings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

    // Get batches expiring within warning period
    const expiringBatches = await prisma.batch.findMany({
      where: {
        deletedAt: null,
        isExpired: false,
        isRecalled: false,
        currentQuantity: { gt: 0 },
        expiryDate: {
          gte: today,
          lte: warningDate
        }
      },
      include: {
        product: {
          select: {
            code: true,
            name: true,
            nameAr: true
          }
        },
        stocks: {
          where: { deletedAt: null, quantity: { gt: 0 } },
          include: {
            warehouse: {
              select: {
                id: true,
                users: {
                  where: { deletedAt: null, status: 'ACTIVE' },
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });

    let createdCount = 0;

    for (const batch of expiringBatches) {
      const daysUntilExpiry = Math.ceil(
        (batch.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get unique warehouse users
      const userIds = new Set<string>();
      batch.stocks.forEach(stock => {
        stock.warehouse.users.forEach(user => userIds.add(user.id));
      });

      // Create notification for each user
      for (const userId of userIds) {
        // Check if notification already exists
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: NotificationType.EXPIRY_WARNING,
            referenceType: 'BATCH',
            referenceId: batch.id,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          }
        });

        if (!existing) {
          await this.create({
            type: NotificationType.EXPIRY_WARNING,
            userId,
            title: `Expiry Warning: ${batch.product.code}`,
            titleAr: `تحذير انتهاء الصلاحية: ${batch.product.nameAr || batch.product.name}`,
            message: `Batch ${batch.batchNumber} of ${batch.product.name} expires in ${daysUntilExpiry} days`,
            messageAr: `الدفعة ${batch.batchNumber} من ${batch.product.nameAr || batch.product.name} تنتهي صلاحيتها خلال ${daysUntilExpiry} يوم`,
            referenceType: 'BATCH',
            referenceId: batch.id,
            metadata: { batchNumber: batch.batchNumber, daysUntilExpiry }
          });
          createdCount++;
        }
      }
    }

    logger.info(`Created ${createdCount} expiry warning notifications`);
    return { created: createdCount, batches: expiringBatches.length };
  }

  /**
   * Create low stock notifications
   */
  async createLowStockNotifications() {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE'
      },
      include: {
        stocks: {
          where: { deletedAt: null },
          include: {
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
                users: {
                  where: { deletedAt: null, status: 'ACTIVE' },
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });

    let createdCount = 0;

    for (const product of products) {
      const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);

      if (totalStock > 0 && totalStock <= product.minStockLevel) {
        // Get unique warehouse users
        const userIds = new Set<string>();
        product.stocks.forEach(stock => {
          stock.warehouse.users.forEach(user => userIds.add(user.id));
        });

        for (const userId of userIds) {
          // Check if notification already exists
          const existing = await prisma.notification.findFirst({
            where: {
              userId,
              type: NotificationType.LOW_STOCK,
              referenceType: 'PRODUCT',
              referenceId: product.id,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
          });

          if (!existing) {
            await this.create({
              type: NotificationType.LOW_STOCK,
              userId,
              title: `Low Stock: ${product.code}`,
              titleAr: `مخزون منخفض: ${product.nameAr || product.name}`,
              message: `${product.name} stock is low (${totalStock} units). Minimum level: ${product.minStockLevel}`,
              messageAr: `مخزون ${product.nameAr || product.name} منخفض (${totalStock} وحدة). الحد الأدنى: ${product.minStockLevel}`,
              referenceType: 'PRODUCT',
              referenceId: product.id,
              metadata: { currentStock: totalStock, minLevel: product.minStockLevel }
            });
            createdCount++;
          }
        }
      }
    }

    logger.info(`Created ${createdCount} low stock notifications`);
    return { created: createdCount };
  }

  /**
   * Delete expired notifications
   */
  async deleteExpired() {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    logger.info(`Deleted ${result.count} expired notifications`);
    return result;
  }

  /**
   * Get notification statistics
   */
  async getStatistics(userId?: string) {
    const where: any = {};
    if (userId) {
      if (!ValidationUtil.isValidUUID(userId)) {
        throw new Error('Invalid user ID');
      }
      where.userId = userId;
    }

    const [total, unread, byType, byStatus] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, status: NotificationStatus.UNREAD } }),
      prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      prisma.notification.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ]);

    const typeCounts = byType.reduce((acc: any, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {});

    const statusCounts = byStatus.reduce((acc: any, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    return {
      total,
      unread,
      byType: typeCounts,
      byStatus: statusCounts
    };
  }
}
