import { PrismaClient, StockCountStatus, MovementType } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface StockCountFilters {
  status?: StockCountStatus;
  warehouseId?: string;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateStockCountData {
  warehouseId: string;
  scheduledDate: Date;
  notes?: string;
}

export interface StockCountItemInput {
  productId: string;
  batchId?: string;
  countedQty: number;
  notes?: string;
}

export class StockCountService {
  /**
   * Get all stock counts with pagination and filtering
   */
  async getAll(page: number = 1, limit: number = 20, filters?: StockCountFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

    if (filters?.status) where.status = filters.status;
    if (filters?.warehouseId) {
      if (!ValidationUtil.isValidUUID(filters.warehouseId)) {
        throw new Error('Invalid warehouse ID');
      }
      where.warehouseId = filters.warehouseId;
    }
    if (filters?.createdById) where.createdById = filters.createdById;

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledDate = {};
      if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom;
      if (filters.dateTo) where.scheduledDate.lte = filters.dateTo;
    }

    const [counts, total] = await Promise.all([
      prisma.stockCount.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  code: true,
                  name: true,
                  unitOfMeasure: true
                }
              }
            }
          }
        },
        orderBy: { scheduledDate: 'desc' }
      }),
      prisma.stockCount.count({ where })
    ]);

    return PaginationUtil.createResponse(counts, total, page, parsedLimit);
  }

  /**
   * Get stock count by ID
   */
  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null },
      include: {
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!count) throw new Error('Stock count not found');

    return count;
  }

  /**
   * Create new stock count
   */
  async create(data: CreateStockCountData, createdById: string) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'warehouseId',
      'scheduledDate'
    ]);
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Validate warehouse
    if (!ValidationUtil.isValidUUID(data.warehouseId)) {
      throw new Error('Invalid warehouse ID');
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId, deletedAt: null }
    });
    if (!warehouse) throw new Error('Warehouse not found');

    // Validate scheduled date is not in the past
    const scheduledDate = new Date(data.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduledDate < today) {
      throw new Error('Scheduled date cannot be in the past');
    }

    // Generate count number
    const countNumber = await this.generateCountNumber();

    // Create stock count
    const stockCount = await prisma.stockCount.create({
      data: {
        countNumber,
        warehouseId: data.warehouseId,
        scheduledDate,
        notes: data.notes,
        createdById,
        status: StockCountStatus.PLANNED
      },
      include: {
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    logger.info(
      `Stock count created: ${countNumber} for warehouse ${warehouse.code} by user ${createdById}`
    );

    return stockCount;
  }

  /**
   * Update stock count (only in PLANNED status)
   */
  async update(id: string, data: Partial<CreateStockCountData>, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null }
    });
    if (!count) throw new Error('Stock count not found');

    if (count.status !== StockCountStatus.PLANNED) {
      throw new Error('Can only update stock counts in PLANNED status');
    }

    const updateData: any = {};
    if (data.scheduledDate) updateData.scheduledDate = data.scheduledDate;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.stockCount.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: true,
        items: true
      }
    });

    logger.info(`Stock count updated: ${count.countNumber} by user ${userId}`);
    return updated;
  }

  /**
   * Start stock count (change to IN_PROGRESS and populate items)
   */
  async start(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null },
      include: { warehouse: true }
    });
    if (!count) throw new Error('Stock count not found');

    if (count.status !== StockCountStatus.PLANNED) {
      throw new Error('Can only start stock counts in PLANNED status');
    }

    // Get all current stock in the warehouse
    const stocks = await prisma.stock.findMany({
      where: {
        warehouseId: count.warehouseId,
        deletedAt: null,
        quantity: { gt: 0 }
      },
      include: {
        product: true
      }
    });

    // Create stock count items with system quantities
    const items = stocks.map(stock => ({
      stockCountId: id,
      productId: stock.productId,
      batchId: stock.batchId,
      systemQty: stock.quantity,
      countedQty: null as number | null,
      variance: null as number | null
    }));

    // Update status and create items
    const updated = await prisma.stockCount.update({
      where: { id },
      data: {
        status: StockCountStatus.IN_PROGRESS,
        startDate: new Date(),
        items: {
          create: items
        }
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    logger.info(`Stock count started: ${count.countNumber} with ${items.length} items by user ${userId}`);
    return updated;
  }

  /**
   * Record counted quantities
   */
  async recordCounts(id: string, countedItems: StockCountItemInput[], userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null },
      include: { items: true }
    });
    if (!count) throw new Error('Stock count not found');

    if (count.status !== StockCountStatus.IN_PROGRESS) {
      throw new Error('Can only record counts for stock counts in IN_PROGRESS status');
    }

    // Update each counted item
    for (const countedItem of countedItems) {
      // Find matching item
      const item = count.items.find(
        i => i.productId === countedItem.productId &&
             (i.batchId === countedItem.batchId || (!i.batchId && !countedItem.batchId))
      );

      if (!item) {
        throw new Error(`Stock count item not found for product ${countedItem.productId}`);
      }

      if (countedItem.countedQty < 0) {
        throw new Error('Counted quantity cannot be negative');
      }

      // Calculate variance
      const variance = countedItem.countedQty - item.systemQty;

      // Update item
      await prisma.stockCountItem.update({
        where: { id: item.id },
        data: {
          countedQty: countedItem.countedQty,
          variance,
          notes: countedItem.notes
        }
      });
    }

    logger.info(`Recorded counts for ${countedItems.length} items in stock count ${count.countNumber} by user ${userId}`);

    // Return updated count
    return this.getById(id);
  }

  /**
   * Complete stock count
   */
  async complete(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null },
      include: { items: true }
    });
    if (!count) throw new Error('Stock count not found');

    if (count.status !== StockCountStatus.IN_PROGRESS) {
      throw new Error('Can only complete stock counts in IN_PROGRESS status');
    }

    // Check if all items have been counted
    const uncountedItems = count.items.filter(item => item.countedQty === null);
    if (uncountedItems.length > 0) {
      throw new Error(`${uncountedItems.length} items have not been counted yet`);
    }

    const updated = await prisma.stockCount.update({
      where: { id },
      data: {
        status: StockCountStatus.COMPLETED,
        endDate: new Date()
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    logger.info(`Stock count completed: ${count.countNumber} by user ${userId}`);
    return updated;
  }

  /**
   * Approve stock count and adjust stock levels
   */
  async approve(id: string, approvedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: {
            product: true
          }
        },
        warehouse: true
      }
    });
    if (!count) throw new Error('Stock count not found');

    if (count.status !== StockCountStatus.COMPLETED) {
      throw new Error('Can only approve stock counts in COMPLETED status');
    }

    // Process adjustments for items with variance
    for (const item of count.items) {
      if (item.variance !== null && item.variance !== 0) {
        // Create stock movement for the variance
        const movementNumber = await this.generateMovementNumber();

        await prisma.stockMovement.create({
          data: {
            movementNumber,
            type: MovementType.STOCK_COUNT,
            productId: item.productId,
            batchId: item.batchId,
            warehouseId: count.warehouseId,
            quantity: item.variance!,
            referenceType: 'STOCK_COUNT',
            referenceId: count.id,
            notes: `Stock count adjustment: ${count.countNumber}. System: ${item.systemQty}, Counted: ${item.countedQty}`,
            userId: approvedBy,
            createdBy: approvedBy
          }
        });

        // Update stock quantity
        await prisma.stock.updateMany({
          where: {
            productId: item.productId,
            warehouseId: count.warehouseId,
            batchId: item.batchId,
            deletedAt: null
          },
          data: {
            quantity: item.countedQty!,
            availableQty: { increment: item.variance! }
          }
        });
      }
    }

    const updated = await prisma.stockCount.update({
      where: { id },
      data: {
        status: StockCountStatus.APPROVED,
        approvedBy
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    logger.info(`Stock count approved: ${count.countNumber} by user ${approvedBy}. Adjustments applied.`);
    return updated;
  }

  /**
   * Cancel stock count
   */
  async cancel(id: string, cancelledBy: string, reason?: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null }
    });
    if (!count) throw new Error('Stock count not found');

    if ([StockCountStatus.APPROVED, StockCountStatus.CANCELLED].includes(count.status)) {
      throw new Error('Cannot cancel stock count in current status');
    }

    const updated = await prisma.stockCount.update({
      where: { id },
      data: {
        status: StockCountStatus.CANCELLED,
        notes: reason ? `${count.notes || ''}\n\nCancelled: ${reason}` : count.notes
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    logger.info(`Stock count cancelled: ${count.countNumber} by user ${cancelledBy}`);
    return updated;
  }

  /**
   * Get variance report
   */
  async getVarianceReport(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock count ID');

    const count = await prisma.stockCount.findFirst({
      where: { id, deletedAt: null },
      include: {
        warehouse: true,
        items: {
          where: {
            variance: { not: 0 }
          },
          include: {
            product: true
          },
          orderBy: {
            variance: 'desc'
          }
        }
      }
    });

    if (!count) throw new Error('Stock count not found');

    const summary = {
      totalItems: count.items.length,
      positiveVariances: count.items.filter(i => i.variance! > 0).length,
      negativeVariances: count.items.filter(i => i.variance! < 0).length,
      totalPositiveQty: count.items.reduce((sum, i) => sum + (i.variance! > 0 ? i.variance! : 0), 0),
      totalNegativeQty: count.items.reduce((sum, i) => sum + (i.variance! < 0 ? Math.abs(i.variance!) : 0), 0)
    };

    return {
      count,
      summary
    };
  }

  /**
   * Get stock count statistics
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const where: any = { deletedAt: null };

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) where.scheduledDate.gte = dateFrom;
      if (dateTo) where.scheduledDate.lte = dateTo;
    }

    const [total, byStatus] = await Promise.all([
      prisma.stockCount.count({ where }),
      prisma.stockCount.groupBy({
        by: ['status'],
        where,
        _count: true
      })
    ]);

    const statusCounts = byStatus.reduce((acc: any, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    return {
      total,
      byStatus: statusCounts
    };
  }

  /**
   * Helper: Generate unique count number
   */
  private async generateCountNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await prisma.stockCount.count({
      where: {
        createdAt: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `SC-${year}${month}${day}-${sequence}`;
  }

  /**
   * Helper: Generate unique movement number
   */
  private async generateMovementNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await prisma.stockMovement.count({
      where: {
        createdAt: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `SM-${year}${month}${day}-${sequence}`;
  }
}
