import { PrismaClient, MovementType } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface StockFilters {
  productId?: string;
  warehouseId?: string;
  zoneId?: string;
  shelfId?: string;
  batchId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  hasReserved?: boolean;
}

export interface StockAdjustmentData {
  productId: string;
  batchId?: string;
  warehouseId: string;
  zoneId?: string;
  shelfId?: string;
  quantityChange: number;
  reason: string;
  notes?: string;
}

export class StockService {
  /**
   * Get all stock records with pagination and filtering
   */
  async getAll(page: number = 1, limit: number = 20, filters?: StockFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

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

    if (filters?.zoneId) where.zoneId = filters.zoneId;
    if (filters?.shelfId) where.shelfId = filters.shelfId;
    if (filters?.batchId) where.batchId = filters.batchId;
    if (filters?.lowStock) where.quantity = { gt: 0, lte: where.product?.minStockLevel || 10 };
    if (filters?.outOfStock) where.quantity = 0;
    if (filters?.hasReserved) where.reservedQty = { gt: 0 };

    const [stocks, total] = await Promise.all([
      prisma.stock.findMany({
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
              unitOfMeasure: true,
              minStockLevel: true,
              maxStockLevel: true
            }
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
              isExpired: true
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
          zone: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          shelf: {
            select: {
              id: true,
              code: true,
              capacity: true
            }
          }
        },
        orderBy: [
          { warehouse: { code: 'asc' } },
          { product: { code: 'asc' } }
        ]
      }),
      prisma.stock.count({ where })
    ]);

    // Calculate stock status for each item
    const stocksWithStatus = stocks.map(stock => ({
      ...stock,
      status: this.getStockStatus(stock.quantity, stock.product.minStockLevel),
      utilizationPercent: stock.product.maxStockLevel
        ? ((stock.quantity / stock.product.maxStockLevel) * 100).toFixed(2)
        : null
    }));

    return PaginationUtil.createResponse(stocksWithStatus, total, page, parsedLimit);
  }

  /**
   * Get stock by ID
   */
  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid stock ID');

    const stock = await prisma.stock.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: true,
        batch: true,
        warehouse: true,
        zone: true,
        shelf: true
      }
    });

    if (!stock) throw new Error('Stock record not found');

    return {
      ...stock,
      status: this.getStockStatus(stock.quantity, stock.product.minStockLevel)
    };
  }

  /**
   * Get stock by product
   */
  async getByProduct(productId: string) {
    if (!ValidationUtil.isValidUUID(productId)) throw new Error('Invalid product ID');

    const stocks = await prisma.stock.findMany({
      where: { productId, deletedAt: null },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            isExpired: true
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
        zone: { select: { id: true, code: true, name: true } },
        shelf: { select: { id: true, code: true } }
      },
      orderBy: { warehouse: { code: 'asc' } }
    });

    const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const totalReserved = stocks.reduce((sum, s) => sum + s.reservedQty, 0);
    const totalAvailable = stocks.reduce((sum, s) => sum + s.availableQty, 0);

    return {
      stocks,
      summary: {
        totalQuantity,
        totalReserved,
        totalAvailable,
        locations: stocks.length
      }
    };
  }

  /**
   * Get stock by warehouse
   */
  async getByWarehouse(warehouseId: string) {
    if (!ValidationUtil.isValidUUID(warehouseId)) throw new Error('Invalid warehouse ID');

    const stocks = await prisma.stock.findMany({
      where: { warehouseId, deletedAt: null, quantity: { gt: 0 } },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            category: true,
            unitOfMeasure: true,
            minStockLevel: true
          }
        },
        batch: {
          select: {
            batchNumber: true,
            expiryDate: true,
            isExpired: true
          }
        },
        zone: { select: { code: true, name: true } },
        shelf: { select: { code: true } }
      },
      orderBy: { product: { code: 'asc' } }
    });

    const summary = {
      totalItems: stocks.length,
      totalQuantity: stocks.reduce((sum, s) => sum + s.quantity, 0),
      totalReserved: stocks.reduce((sum, s) => sum + s.reservedQty, 0),
      totalAvailable: stocks.reduce((sum, s) => sum + s.availableQty, 0),
      lowStockItems: stocks.filter(s => s.quantity > 0 && s.quantity <= s.product.minStockLevel).length,
      outOfStockItems: stocks.filter(s => s.quantity === 0).length
    };

    return { stocks, summary };
  }

  /**
   * Get low stock items
   */
  async getLowStock() {
    const stocks = await prisma.stock.findMany({
      where: {
        deletedAt: null,
        quantity: { gt: 0 }
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            nameAr: true,
            category: true,
            unitOfMeasure: true,
            minStockLevel: true,
            reorderPoint: true
          }
        },
        warehouse: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        batch: {
          select: {
            batchNumber: true,
            expiryDate: true
          }
        }
      }
    });

    const lowStockItems = stocks.filter(
      stock => stock.quantity <= stock.product.minStockLevel
    ).map(stock => ({
      ...stock,
      deficit: stock.product.minStockLevel - stock.quantity,
      status: this.getStockStatus(stock.quantity, stock.product.minStockLevel)
    }));

    return lowStockItems;
  }

  /**
   * Get out of stock items
   */
  async getOutOfStock() {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      include: {
        stocks: {
          where: { deletedAt: null },
          select: {
            quantity: true,
            warehouseId: true,
            warehouse: {
              select: {
                code: true,
                name: true
              }
            }
          }
        }
      }
    });

    const outOfStockProducts = products.filter(product => {
      const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
      return totalStock === 0;
    });

    return outOfStockProducts.map(product => ({
      id: product.id,
      code: product.code,
      name: product.name,
      nameAr: product.nameAr,
      category: product.category,
      minStockLevel: product.minStockLevel,
      lastLocations: product.stocks.map(s => ({
        warehouseCode: s.warehouse.code,
        warehouseName: s.warehouse.name
      }))
    }));
  }

  /**
   * Adjust stock quantity
   */
  async adjustStock(data: StockAdjustmentData, userId: string) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'productId',
      'warehouseId',
      'quantityChange',
      'reason'
    ]);
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Validate UUIDs
    if (!ValidationUtil.isValidUUID(data.productId)) throw new Error('Invalid product ID');
    if (!ValidationUtil.isValidUUID(data.warehouseId)) throw new Error('Invalid warehouse ID');

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

    // Find or create stock record
    const whereClause: any = {
      productId: data.productId,
      warehouseId: data.warehouseId,
      batchId: data.batchId || null,
      zoneId: data.zoneId || null,
      shelfId: data.shelfId || null,
      deletedAt: null
    };

    let stock = await prisma.stock.findFirst({ where: whereClause });

    const newQuantity = (stock?.quantity || 0) + data.quantityChange;

    if (newQuantity < 0) {
      throw new Error('Adjustment would result in negative stock quantity');
    }

    // Create stock movement record
    const movementNumber = await this.generateMovementNumber();
    const stockMovement = await prisma.stockMovement.create({
      data: {
        movementNumber,
        type: MovementType.ADJUSTMENT,
        productId: data.productId,
        batchId: data.batchId,
        warehouseId: data.warehouseId,
        quantity: data.quantityChange,
        reason: data.reason,
        notes: data.notes,
        userId,
        createdBy: userId
      }
    });

    // Update or create stock
    if (stock) {
      stock = await prisma.stock.update({
        where: { id: stock.id },
        data: {
          quantity: newQuantity,
          availableQty: newQuantity - stock.reservedQty,
          lastMovementDate: new Date(),
          updatedAt: new Date()
        },
        include: {
          product: true,
          warehouse: true,
          batch: true
        }
      });
    } else {
      stock = await prisma.stock.create({
        data: {
          productId: data.productId,
          batchId: data.batchId,
          warehouseId: data.warehouseId,
          zoneId: data.zoneId,
          shelfId: data.shelfId,
          quantity: newQuantity,
          reservedQty: 0,
          availableQty: newQuantity,
          lastMovementDate: new Date()
        },
        include: {
          product: true,
          warehouse: true,
          batch: true
        }
      });
    }

    logger.info(
      `Stock adjusted: ${product.code} at ${warehouse.code} by ${data.quantityChange} (Reason: ${data.reason}) by user ${userId}`
    );

    return { stock, movement: stockMovement };
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(productId: string, warehouseId: string, quantity: number, batchId?: string) {
    if (!ValidationUtil.isValidUUID(productId)) throw new Error('Invalid product ID');
    if (!ValidationUtil.isValidUUID(warehouseId)) throw new Error('Invalid warehouse ID');

    if (quantity <= 0) throw new Error('Quantity must be greater than 0');

    const whereClause: any = {
      productId,
      warehouseId,
      deletedAt: null
    };
    if (batchId) whereClause.batchId = batchId;

    const stock = await prisma.stock.findFirst({ where: whereClause });

    if (!stock) throw new Error('Stock not found');

    if (stock.availableQty < quantity) {
      throw new Error(`Insufficient available stock. Available: ${stock.availableQty}, Requested: ${quantity}`);
    }

    const updatedStock = await prisma.stock.update({
      where: { id: stock.id },
      data: {
        reservedQty: stock.reservedQty + quantity,
        availableQty: stock.availableQty - quantity
      }
    });

    logger.info(`Stock reserved: ${quantity} units of product ${productId} at warehouse ${warehouseId}`);
    return updatedStock;
  }

  /**
   * Release reserved stock
   */
  async releaseReservedStock(productId: string, warehouseId: string, quantity: number, batchId?: string) {
    if (!ValidationUtil.isValidUUID(productId)) throw new Error('Invalid product ID');
    if (!ValidationUtil.isValidUUID(warehouseId)) throw new Error('Invalid warehouse ID');

    if (quantity <= 0) throw new Error('Quantity must be greater than 0');

    const whereClause: any = {
      productId,
      warehouseId,
      deletedAt: null
    };
    if (batchId) whereClause.batchId = batchId;

    const stock = await prisma.stock.findFirst({ where: whereClause });

    if (!stock) throw new Error('Stock not found');

    if (stock.reservedQty < quantity) {
      throw new Error(`Cannot release more than reserved. Reserved: ${stock.reservedQty}, Requested: ${quantity}`);
    }

    const updatedStock = await prisma.stock.update({
      where: { id: stock.id },
      data: {
        reservedQty: stock.reservedQty - quantity,
        availableQty: stock.availableQty + quantity
      }
    });

    logger.info(`Reserved stock released: ${quantity} units of product ${productId} at warehouse ${warehouseId}`);
    return updatedStock;
  }

  /**
   * Get stock statistics
   */
  async getStatistics() {
    const [
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      totalReserved,
      stockByWarehouse
    ] = await Promise.all([
      prisma.stock.aggregate({
        where: { deletedAt: null },
        _sum: { quantity: true, reservedQty: true, availableQty: true }
      }),
      this.getLowStock().then(items => items.length),
      this.getOutOfStock().then(items => items.length),
      prisma.stock.aggregate({
        where: { deletedAt: null, reservedQty: { gt: 0 } },
        _count: true
      }),
      prisma.stock.groupBy({
        by: ['warehouseId'],
        where: { deletedAt: null },
        _sum: { quantity: true, reservedQty: true, availableQty: true },
        _count: true
      })
    ]);

    return {
      totalQuantity: totalStockValue._sum.quantity || 0,
      totalReserved: totalStockValue._sum.reservedQty || 0,
      totalAvailable: totalStockValue._sum.availableQty || 0,
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      itemsWithReservations: totalReserved._count,
      stockByWarehouse: stockByWarehouse.length
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

  /**
   * Helper: Determine stock status
   */
  private getStockStatus(quantity: number, minStockLevel: number): string {
    if (quantity === 0) return 'OUT_OF_STOCK';
    if (quantity <= minStockLevel * 0.5) return 'CRITICAL';
    if (quantity <= minStockLevel) return 'LOW';
    return 'OK';
  }
}
