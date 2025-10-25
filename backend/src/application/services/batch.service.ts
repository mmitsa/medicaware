import { PrismaClient } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';
import { EXPIRY_WARNING_DAYS } from '../../shared/constants';

const prisma = new PrismaClient();

export interface BatchFilters {
  productId?: string;
  isExpired?: boolean;
  isRecalled?: boolean;
  expiringWithinDays?: number;
  search?: string;
}

export interface CreateBatchData {
  batchNumber: string;
  productId: string;
  manufacturingDate?: Date;
  expiryDate: Date;
  receivedDate?: Date;
  initialQuantity: number;
  currentQuantity?: number;
  costPrice?: number;
}

export class BatchService {
  async getAll(page: number = 1, limit: number = 20, filters?: BatchFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

    if (filters?.productId) {
      if (!ValidationUtil.isValidUUID(filters.productId)) {
        throw new Error('Invalid product ID');
      }
      where.productId = filters.productId;
    }

    if (filters?.isExpired !== undefined) where.isExpired = filters.isExpired;
    if (filters?.isRecalled !== undefined) where.isRecalled = filters.isRecalled;

    if (filters?.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
      where.expiryDate = {
        gte: new Date(),
        lte: futureDate
      };
      where.isExpired = false;
    }

    if (filters?.search) {
      where.OR = [
        { batchNumber: { contains: filters.search, mode: 'insensitive' } },
        { product: { name: { contains: filters.search, mode: 'insensitive' } } },
        { product: { code: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              nameAr: true,
              category: true,
              unitOfMeasure: true
            }
          },
          _count: {
            select: { stocks: true, stockMovements: true }
          }
        },
        orderBy: { expiryDate: 'asc' }
      }),
      prisma.batch.count({ where })
    ]);

    // Add expiry status to each batch
    const batchesWithStatus = batches.map(batch => ({
      ...batch,
      daysUntilExpiry: this.calculateDaysUntilExpiry(batch.expiryDate),
      expiryStatus: this.getExpiryStatus(batch.expiryDate, batch.isExpired)
    }));

    return PaginationUtil.createResponse(batchesWithStatus, total, page, parsedLimit);
  }

  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid batch ID');

    const batch = await prisma.batch.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: {
          include: {
            _count: { select: { batches: true } }
          }
        },
        stocks: {
          where: { deletedAt: null },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            shelf: {
              select: {
                id: true,
                code: true,
                zone: { select: { id: true, code: true, warehouseId: true } }
              }
            }
          }
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            createdByUser: { select: { id: true, username: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!batch) throw new Error('Batch not found');

    return {
      ...batch,
      daysUntilExpiry: this.calculateDaysUntilExpiry(batch.expiryDate),
      expiryStatus: this.getExpiryStatus(batch.expiryDate, batch.isExpired)
    };
  }

  async create(data: CreateBatchData, createdBy: string) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'batchNumber',
      'productId',
      'expiryDate',
      'initialQuantity'
    ]);
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Check if product exists
    if (!ValidationUtil.isValidUUID(data.productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await prisma.product.findFirst({
      where: { id: data.productId, deletedAt: null }
    });
    if (!product) throw new Error('Product not found');

    // Check if batch number already exists
    const existing = await prisma.batch.findFirst({
      where: { batchNumber: data.batchNumber, deletedAt: null }
    });
    if (existing) throw new Error('Batch number already exists');

    // Validate dates
    const expiryDate = new Date(data.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      throw new Error('Expiry date cannot be in the past');
    }

    if (data.manufacturingDate) {
      const mfgDate = new Date(data.manufacturingDate);
      if (mfgDate > expiryDate) {
        throw new Error('Manufacturing date cannot be after expiry date');
      }
    }

    // Validate quantities
    if (data.initialQuantity <= 0) {
      throw new Error('Initial quantity must be greater than 0');
    }

    const currentQuantity = data.currentQuantity !== undefined ? data.currentQuantity : data.initialQuantity;
    if (currentQuantity < 0 || currentQuantity > data.initialQuantity) {
      throw new Error('Current quantity must be between 0 and initial quantity');
    }

    const isExpired = expiryDate < today;

    const batch = await prisma.batch.create({
      data: {
        ...data,
        currentQuantity,
        isExpired,
        createdBy
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            unitOfMeasure: true
          }
        }
      }
    });

    logger.info(`Batch created: ${batch.batchNumber} for product ${product.code} by ${createdBy}`);
    return batch;
  }

  async update(id: string, data: Partial<CreateBatchData>, updatedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid batch ID');

    const existing = await prisma.batch.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) throw new Error('Batch not found');

    // Check if new batch number already exists
    if (data.batchNumber && data.batchNumber !== existing.batchNumber) {
      const batchExists = await prisma.batch.findFirst({
        where: { batchNumber: data.batchNumber, id: { not: id }, deletedAt: null }
      });
      if (batchExists) throw new Error('Batch number already exists');
    }

    // Validate dates if provided
    if (data.expiryDate) {
      const expiryDate = new Date(data.expiryDate);
      if (data.manufacturingDate) {
        const mfgDate = new Date(data.manufacturingDate);
        if (mfgDate > expiryDate) {
          throw new Error('Manufacturing date cannot be after expiry date');
        }
      }
    }

    // Validate quantities if provided
    if (data.currentQuantity !== undefined) {
      const initialQty = data.initialQuantity || existing.initialQuantity;
      if (data.currentQuantity < 0 || data.currentQuantity > initialQty) {
        throw new Error('Current quantity must be between 0 and initial quantity');
      }
    }

    // Update isExpired flag if expiry date changes
    let updateData: any = { ...data, updatedBy };
    if (data.expiryDate) {
      const expiryDate = new Date(data.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      updateData.isExpired = expiryDate < today;
    }

    const batch = await prisma.batch.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            unitOfMeasure: true
          }
        }
      }
    });

    logger.info(`Batch updated: ${batch.batchNumber} by ${updatedBy}`);
    return batch;
  }

  async delete(id: string, deletedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid batch ID');

    const batch = await prisma.batch.findFirst({
      where: { id, deletedAt: null }
    });
    if (!batch) throw new Error('Batch not found');

    // Check if batch has active stock
    const activeStock = await prisma.stock.findFirst({
      where: { batchId: id, quantity: { gt: 0 }, deletedAt: null }
    });
    if (activeStock) {
      throw new Error('Cannot delete batch with active stock. Please transfer or dispose stock first.');
    }

    await prisma.batch.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy }
    });

    logger.info(`Batch deleted: ${batch.batchNumber} by ${deletedBy}`);
    return { message: 'Batch deleted successfully' };
  }

  async recall(id: string, reason: string, recalledBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid batch ID');

    const batch = await prisma.batch.findFirst({
      where: { id, deletedAt: null }
    });
    if (!batch) throw new Error('Batch not found');

    if (batch.isRecalled) {
      throw new Error('Batch is already recalled');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Recall reason is required');
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        isRecalled: true,
        recallReason: reason,
        updatedBy: recalledBy
      },
      include: {
        product: true,
        stocks: {
          where: { deletedAt: null, quantity: { gt: 0 } },
          include: { warehouse: true }
        }
      }
    });

    // Create notifications for all warehouses that have this batch
    const notificationPromises = updated.stocks.map(stock =>
      prisma.notification.create({
        data: {
          type: 'RECALL',
          title: 'Batch Recall Alert',
          message: `Batch ${batch.batchNumber} of product ${updated.product.name} has been recalled. Reason: ${reason}`,
          priority: 'HIGH',
          isRead: false
        }
      })
    );

    await Promise.all(notificationPromises);

    logger.warn(`Batch recalled: ${batch.batchNumber}. Reason: ${reason}. By: ${recalledBy}`);
    return updated;
  }

  async getExpiringBatches(daysAhead: number = EXPIRY_WARNING_DAYS) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const batches = await prisma.batch.findMany({
      where: {
        deletedAt: null,
        isExpired: false,
        isRecalled: false,
        currentQuantity: { gt: 0 },
        expiryDate: {
          gte: today,
          lte: futureDate
        }
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            category: true,
            unitOfMeasure: true
          }
        },
        stocks: {
          where: { deletedAt: null, quantity: { gt: 0 } },
          include: {
            warehouse: { select: { id: true, name: true, code: true } }
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    return batches.map(batch => ({
      ...batch,
      daysUntilExpiry: this.calculateDaysUntilExpiry(batch.expiryDate),
      expiryStatus: this.getExpiryStatus(batch.expiryDate, batch.isExpired)
    }));
  }

  async getExpiredBatches() {
    const batches = await prisma.batch.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isExpired: true },
          { expiryDate: { lt: new Date() } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            unitOfMeasure: true
          }
        },
        stocks: {
          where: { deletedAt: null, quantity: { gt: 0 } },
          include: {
            warehouse: { select: { id: true, name: true, code: true } }
          }
        }
      },
      orderBy: { expiryDate: 'desc' }
    });

    // Update isExpired flag for batches that are expired but not marked
    const updatePromises = batches
      .filter(b => !b.isExpired && b.expiryDate < new Date())
      .map(b => prisma.batch.update({
        where: { id: b.id },
        data: { isExpired: true }
      }));

    await Promise.all(updatePromises);

    return batches;
  }

  async getStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryWarningDate = new Date();
    expiryWarningDate.setDate(expiryWarningDate.getDate() + EXPIRY_WARNING_DAYS);

    const [total, expired, recalled, expiringSoon] = await Promise.all([
      prisma.batch.count({ where: { deletedAt: null } }),
      prisma.batch.count({ where: { isExpired: true, deletedAt: null } }),
      prisma.batch.count({ where: { isRecalled: true, deletedAt: null } }),
      prisma.batch.count({
        where: {
          deletedAt: null,
          isExpired: false,
          isRecalled: false,
          expiryDate: { gte: today, lte: expiryWarningDate }
        }
      })
    ]);

    const totalValue = await prisma.batch.aggregate({
      where: { deletedAt: null, isExpired: false, isRecalled: false },
      _sum: {
        currentQuantity: true
      }
    });

    return {
      total,
      expired,
      recalled,
      expiringSoon,
      active: total - expired - recalled,
      totalQuantity: totalValue._sum.currentQuantity || 0
    };
  }

  async markAsExpired() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredBatches = await prisma.batch.findMany({
      where: {
        deletedAt: null,
        isExpired: false,
        expiryDate: { lt: today }
      }
    });

    if (expiredBatches.length === 0) {
      return { updated: 0, batches: [] };
    }

    const updatePromises = expiredBatches.map(batch =>
      prisma.batch.update({
        where: { id: batch.id },
        data: { isExpired: true }
      })
    );

    await Promise.all(updatePromises);

    // Create notifications for expired batches
    const notificationPromises = expiredBatches.map(batch =>
      prisma.notification.create({
        data: {
          type: 'EXPIRY',
          title: 'Batch Expired',
          message: `Batch ${batch.batchNumber} has expired`,
          priority: 'HIGH',
          isRead: false
        }
      })
    );

    await Promise.all(notificationPromises);

    logger.info(`Marked ${expiredBatches.length} batches as expired`);
    return {
      updated: expiredBatches.length,
      batches: expiredBatches.map(b => b.batchNumber)
    };
  }

  // Helper methods
  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getExpiryStatus(expiryDate: Date, isExpired: boolean): string {
    if (isExpired) return 'EXPIRED';

    const daysUntilExpiry = this.calculateDaysUntilExpiry(expiryDate);

    if (daysUntilExpiry < 0) return 'EXPIRED';
    if (daysUntilExpiry <= 30) return 'CRITICAL';
    if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) return 'WARNING';
    return 'GOOD';
  }
}
