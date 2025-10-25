import { PrismaClient, MovementType } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface MovementFilters {
  type?: MovementType;
  productId?: string;
  warehouseId?: string;
  batchId?: string;
  userId?: string;
  referenceType?: string;
  referenceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateMovementData {
  type: MovementType;
  productId: string;
  batchId?: string;
  warehouseId: string;
  quantity: number;
  unitPrice?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  reason?: string;
}

export class StockMovementService {
  /**
   * Get all stock movements with pagination and filtering
   */
  async getAll(page: number = 1, limit: number = 20, filters?: MovementFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

    if (filters?.type) where.type = filters.type;
    if (filters?.productId) {
      if (!ValidationUtil.isValidUUID(filters.productId)) {
        throw new Error('Invalid product ID');
      }
      where.productId = filters.productId;
    }
    if (filters?.warehouseId) {
      if (!ValidationUtil.isValidUUID(filters.warehouseId)) {
        throw new Error('Invalid warehouse ID');
      }
      where.warehouseId = filters.warehouseId;
    }
    if (filters?.batchId) where.batchId = filters.batchId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.referenceType) where.referenceType = filters.referenceType;
    if (filters?.referenceId) where.referenceId = filters.referenceId;

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
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
          batch: {
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true
            }
          },
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.stockMovement.count({ where })
    ]);

    return PaginationUtil.createResponse(movements, total, page, parsedLimit);
  }

  /**
   * Get movement by ID
   */
  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid movement ID');

    const movement = await prisma.stockMovement.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: true,
        batch: true,
        warehouse: true,
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

    if (!movement) throw new Error('Stock movement not found');

    return movement;
  }

  /**
   * Get movements by product
   */
  async getByProduct(productId: string, limit: number = 50) {
    if (!ValidationUtil.isValidUUID(productId)) throw new Error('Invalid product ID');

    const movements = await prisma.stockMovement.findMany({
      where: { productId, deletedAt: null },
      include: {
        batch: {
          select: {
            batchNumber: true,
            expiryDate: true
          }
        },
        warehouse: {
          select: {
            code: true,
            name: true
          }
        },
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return movements;
  }

  /**
   * Get movements by warehouse
   */
  async getByWarehouse(warehouseId: string, dateFrom?: Date, dateTo?: Date) {
    if (!ValidationUtil.isValidUUID(warehouseId)) throw new Error('Invalid warehouse ID');

    const where: any = { warehouseId, deletedAt: null };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            code: true,
            name: true,
            category: true
          }
        },
        batch: {
          select: {
            batchNumber: true
          }
        },
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary by movement type
    const summary = movements.reduce((acc: any, movement) => {
      if (!acc[movement.type]) {
        acc[movement.type] = {
          count: 0,
          totalQuantity: 0
        };
      }
      acc[movement.type].count++;
      acc[movement.type].totalQuantity += movement.quantity;
      return acc;
    }, {});

    return { movements, summary };
  }

  /**
   * Create stock movement (Receipt)
   */
  async createReceipt(data: CreateMovementData, userId: string) {
    return this.createMovement({ ...data, type: MovementType.RECEIPT }, userId);
  }

  /**
   * Create stock movement (Issue)
   */
  async createIssue(data: CreateMovementData, userId: string) {
    return this.createMovement({ ...data, type: MovementType.ISSUE }, userId);
  }

  /**
   * Create stock movement (Transfer In)
   */
  async createTransferIn(data: CreateMovementData, userId: string) {
    return this.createMovement({ ...data, type: MovementType.TRANSFER_IN }, userId);
  }

  /**
   * Create stock movement (Transfer Out)
   */
  async createTransferOut(data: CreateMovementData, userId: string) {
    return this.createMovement({ ...data, type: MovementType.TRANSFER_OUT }, userId);
  }

  /**
   * Create stock movement (Return)
   */
  async createReturn(data: CreateMovementData, userId: string) {
    return this.createMovement({ ...data, type: MovementType.RETURN }, userId);
  }

  /**
   * Create stock movement (Expired)
   */
  async createExpired(data: CreateMovementData, userId: string) {
    return this.createMovement({ ...data, type: MovementType.EXPIRED }, userId);
  }

  /**
   * Create stock movement (Damaged)
   */
  async createDamaged(data: CreateMovementData, userId: string) {
    return this.createMovement({ ...data, type: MovementType.DAMAGED }, userId);
  }

  /**
   * Generic create movement
   */
  private async createMovement(data: CreateMovementData, userId: string) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'type',
      'productId',
      'warehouseId',
      'quantity'
    ]);
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Validate UUIDs
    if (!ValidationUtil.isValidUUID(data.productId)) throw new Error('Invalid product ID');
    if (!ValidationUtil.isValidUUID(data.warehouseId)) throw new Error('Invalid warehouse ID');

    // Validate quantity
    if (data.quantity === 0) throw new Error('Quantity cannot be zero');

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: { id: data.productId, deletedAt: null }
    });
    if (!product) throw new Error('Product not found');

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: data.warehouseId, deletedAt: null }
    });
    if (!warehouse) throw new Error('Warehouse not found');

    // Generate movement number
    const movementNumber = await this.generateMovementNumber();

    // Calculate total value
    const totalValue = data.unitPrice ? data.unitPrice * Math.abs(data.quantity) : null;

    // Create movement
    const movement = await prisma.stockMovement.create({
      data: {
        movementNumber,
        type: data.type,
        productId: data.productId,
        batchId: data.batchId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalValue: totalValue,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes,
        reason: data.reason,
        userId,
        createdBy: userId
      },
      include: {
        product: true,
        batch: true,
        warehouse: true,
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Update stock based on movement type
    await this.updateStockFromMovement(movement);

    logger.info(
      `Stock movement created: ${movementNumber} - ${data.type} - ${product.code} - Qty: ${data.quantity} at ${warehouse.code}`
    );

    return movement;
  }

  /**
   * Update stock record based on movement
   */
  private async updateStockFromMovement(movement: any) {
    const whereClause: any = {
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      batchId: movement.batchId || null,
      deletedAt: null
    };

    let stock = await prisma.stock.findFirst({ where: whereClause });

    // Determine quantity change based on movement type
    let quantityChange = 0;
    switch (movement.type) {
      case MovementType.RECEIPT:
      case MovementType.TRANSFER_IN:
      case MovementType.RETURN:
      case MovementType.FOUND:
        quantityChange = Math.abs(movement.quantity);
        break;
      case MovementType.ISSUE:
      case MovementType.TRANSFER_OUT:
      case MovementType.EXPIRED:
      case MovementType.DAMAGED:
      case MovementType.LOST:
        quantityChange = -Math.abs(movement.quantity);
        break;
      case MovementType.ADJUSTMENT:
        quantityChange = movement.quantity;
        break;
      case MovementType.STOCK_COUNT:
        // Stock count movements don't automatically update stock
        // They are handled separately by the stock count approval process
        return;
    }

    if (stock) {
      const newQuantity = stock.quantity + quantityChange;
      if (newQuantity < 0) {
        throw new Error('Stock movement would result in negative stock quantity');
      }

      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          quantity: newQuantity,
          availableQty: newQuantity - stock.reservedQty,
          lastMovementDate: new Date()
        }
      });
    } else if (quantityChange > 0) {
      // Create new stock record for positive movements
      await prisma.stock.create({
        data: {
          productId: movement.productId,
          batchId: movement.batchId,
          warehouseId: movement.warehouseId,
          quantity: quantityChange,
          reservedQty: 0,
          availableQty: quantityChange,
          lastMovementDate: new Date()
        }
      });
    } else {
      throw new Error('Cannot create negative stock from movement');
    }
  }

  /**
   * Get movement statistics
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const where: any = { deletedAt: null };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [totalMovements, movementsByType, recentMovements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.groupBy({
        by: ['type'],
        where,
        _count: true,
        _sum: { quantity: true }
      }),
      prisma.stockMovement.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          movementNumber: true,
          type: true,
          quantity: true,
          createdAt: true,
          product: {
            select: {
              code: true,
              name: true
            }
          },
          warehouse: {
            select: {
              code: true,
              name: true
            }
          }
        }
      })
    ]);

    const byType = movementsByType.reduce((acc: any, item) => {
      acc[item.type] = {
        count: item._count,
        totalQuantity: item._sum.quantity || 0
      };
      return acc;
    }, {});

    return {
      totalMovements,
      byType,
      recentMovements
    };
  }

  /**
   * Get movement report
   */
  async getReport(warehouseId?: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = { deletedAt: null };

    if (warehouseId) {
      if (!ValidationUtil.isValidUUID(warehouseId)) {
        throw new Error('Invalid warehouse ID');
      }
      where.warehouseId = warehouseId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            code: true,
            name: true,
            category: true
          }
        },
        batch: {
          select: {
            batchNumber: true
          }
        },
        warehouse: {
          select: {
            code: true,
            name: true
          }
        },
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary
    const summary = {
      totalMovements: movements.length,
      byType: {} as any,
      byProduct: {} as any,
      totalValue: 0
    };

    movements.forEach(movement => {
      // By type
      if (!summary.byType[movement.type]) {
        summary.byType[movement.type] = { count: 0, totalQuantity: 0 };
      }
      summary.byType[movement.type].count++;
      summary.byType[movement.type].totalQuantity += movement.quantity;

      // By product
      const productKey = movement.product.code;
      if (!summary.byProduct[productKey]) {
        summary.byProduct[productKey] = {
          name: movement.product.name,
          count: 0,
          totalQuantity: 0
        };
      }
      summary.byProduct[productKey].count++;
      summary.byProduct[productKey].totalQuantity += movement.quantity;

      // Total value
      if (movement.totalValue) {
        summary.totalValue += Number(movement.totalValue);
      }
    });

    return {
      movements,
      summary,
      filters: {
        warehouseId,
        dateFrom,
        dateTo
      }
    };
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
