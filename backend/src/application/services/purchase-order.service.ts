import { PrismaClient, PurchaseOrderStatus, MovementType } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus;
  supplier?: string;
  warehouseId?: string;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreatePurchaseOrderData {
  supplier: string;
  warehouseId: string;
  expectedDate?: Date;
  notes?: string;
  items: PurchaseOrderItemData[];
}

export interface PurchaseOrderItemData {
  productId: string;
  orderedQty: number;
  unitPrice: number;
  notes?: string;
}

export class PurchaseOrderService {
  /**
   * Get all purchase orders with pagination and filtering
   */
  async getAll(page: number = 1, limit: number = 20, filters?: PurchaseOrderFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

    if (filters?.status) where.status = filters.status;
    if (filters?.supplier) where.supplier = { contains: filters.supplier, mode: 'insensitive' };
    if (filters?.warehouseId) {
      if (!ValidationUtil.isValidUUID(filters.warehouseId)) {
        throw new Error('Invalid warehouse ID');
      }
      where.warehouseId = filters.warehouseId;
    }
    if (filters?.createdById) where.createdById = filters.createdById;

    if (filters?.dateFrom || filters?.dateTo) {
      where.orderDate = {};
      if (filters.dateFrom) where.orderDate.gte = filters.dateFrom;
      if (filters.dateTo) where.orderDate.lte = filters.dateTo;
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
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
                  id: true,
                  code: true,
                  name: true,
                  nameAr: true,
                  unitOfMeasure: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.purchaseOrder.count({ where })
    ]);

    return PaginationUtil.createResponse(orders, total, page, parsedLimit);
  }

  /**
   * Get purchase order by ID
   */
  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid purchase order ID');

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
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

    if (!order) throw new Error('Purchase order not found');

    return order;
  }

  /**
   * Create new purchase order
   */
  async create(data: CreatePurchaseOrderData, createdById: string) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'supplier',
      'warehouseId',
      'items'
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

    // Validate supplier
    if (!data.supplier || data.supplier.trim().length === 0) {
      throw new Error('Supplier name is required');
    }

    // Validate items
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('At least one item is required');
    }

    let totalAmount = 0;

    // Validate all products exist and calculate totals
    for (const item of data.items) {
      if (!ValidationUtil.isValidUUID(item.productId)) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }
      if (item.orderedQty <= 0) {
        throw new Error('Ordered quantity must be greater than 0');
      }
      if (item.unitPrice < 0) {
        throw new Error('Unit price cannot be negative');
      }

      const product = await prisma.product.findFirst({
        where: { id: item.productId, deletedAt: null }
      });
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      totalAmount += item.orderedQty * item.unitPrice;
    }

    // Calculate tax (15% VAT in Saudi Arabia)
    const taxAmount = totalAmount * 0.15;
    const grandTotal = totalAmount + taxAmount;

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Create purchase order with items
    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplier: data.supplier.trim(),
        warehouseId: data.warehouseId,
        expectedDate: data.expectedDate,
        notes: data.notes,
        totalAmount,
        taxAmount,
        grandTotal,
        createdById,
        status: PurchaseOrderStatus.DRAFT,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            orderedQty: item.orderedQty,
            unitPrice: item.unitPrice,
            totalPrice: item.orderedQty * item.unitPrice,
            notes: item.notes
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    logger.info(
      `Purchase order created: ${orderNumber} for supplier ${data.supplier} by user ${createdById}`
    );

    return order;
  }

  /**
   * Update purchase order (only in DRAFT status)
   */
  async update(id: string, data: Partial<CreatePurchaseOrderData>, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid purchase order ID');

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null }
    });
    if (!order) throw new Error('Purchase order not found');

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new Error('Can only update purchase orders in DRAFT status');
    }

    const updateData: any = {};
    if (data.supplier) updateData.supplier = data.supplier.trim();
    if (data.warehouseId) updateData.warehouseId = data.warehouseId;
    if (data.expectedDate) updateData.expectedDate = data.expectedDate;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    logger.info(`Purchase order updated: ${order.orderNumber} by user ${userId}`);
    return updated;
  }

  /**
   * Submit purchase order
   */
  async submit(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid purchase order ID');

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: true }
    });
    if (!order) throw new Error('Purchase order not found');

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new Error('Can only submit purchase orders in DRAFT status');
    }

    if (!order.items || order.items.length === 0) {
      throw new Error('Cannot submit purchase order without items');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SUBMITTED },
      include: {
        items: { include: { product: true } }
      }
    });

    logger.info(`Purchase order submitted: ${order.orderNumber} by user ${userId}`);
    return updated;
  }

  /**
   * Approve purchase order
   */
  async approve(id: string, approvedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid purchase order ID');

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: true }
    });
    if (!order) throw new Error('Purchase order not found');

    if (order.status !== PurchaseOrderStatus.SUBMITTED) {
      throw new Error('Can only approve purchase orders in SUBMITTED status');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.APPROVED,
        approvedBy
      },
      include: {
        items: { include: { product: true } }
      }
    });

    logger.info(`Purchase order approved: ${order.orderNumber} by user ${approvedBy}`);
    return updated;
  }

  /**
   * Place order with supplier (mark as ORDERED)
   */
  async placeOrder(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid purchase order ID');

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null }
    });
    if (!order) throw new Error('Purchase order not found');

    if (order.status !== PurchaseOrderStatus.APPROVED) {
      throw new Error('Can only place orders that are APPROVED');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.ORDERED },
      include: {
        items: { include: { product: true } }
      }
    });

    logger.info(`Purchase order placed: ${order.orderNumber} by user ${userId}`);
    return updated;
  }

  /**
   * Receive purchase order (creates stock movements)
   */
  async receive(id: string, receivedBy: string, receivedItems: { [itemId: string]: { receivedQty: number; batchNumber?: string; expiryDate?: Date } }) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid purchase order ID');

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: { product: true }
        }
      }
    });
    if (!order) throw new Error('Purchase order not found');

    if (order.status !== PurchaseOrderStatus.ORDERED) {
      throw new Error('Can only receive purchase orders in ORDERED status');
    }

    // Process each received item
    for (const [itemId, receiveData] of Object.entries(receivedItems)) {
      const item = order.items.find(i => i.id === itemId);
      if (!item) {
        throw new Error(`Purchase order item not found: ${itemId}`);
      }

      if (receiveData.receivedQty <= 0 || receiveData.receivedQty > item.orderedQty) {
        throw new Error(
          `Invalid received quantity for ${item.product.code}. Must be between 0 and ${item.orderedQty}`
        );
      }

      // Create batch if batch info provided
      let batchId: string | undefined;
      if (receiveData.batchNumber && receiveData.expiryDate) {
        const batch = await prisma.batch.create({
          data: {
            batchNumber: receiveData.batchNumber,
            productId: item.productId,
            expiryDate: receiveData.expiryDate,
            initialQuantity: receiveData.receivedQty,
            currentQuantity: receiveData.receivedQty,
            costPrice: item.unitPrice,
            createdBy: receivedBy
          }
        });
        batchId = batch.id;
      }

      // Create stock movement
      const movementNumber = await this.generateMovementNumber();
      await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: MovementType.RECEIPT,
          productId: item.productId,
          batchId,
          warehouseId: order.warehouseId,
          quantity: receiveData.receivedQty,
          unitPrice: item.unitPrice,
          totalValue: receiveData.receivedQty * Number(item.unitPrice),
          referenceType: 'PURCHASE_ORDER',
          referenceId: order.id,
          notes: `PO ${order.orderNumber} from ${order.supplier}`,
          userId: receivedBy,
          createdBy: receivedBy
        }
      });

      // Update or create stock
      const existingStock = await prisma.stock.findFirst({
        where: {
          productId: item.productId,
          warehouseId: order.warehouseId,
          batchId: batchId || null,
          deletedAt: null
        }
      });

      if (existingStock) {
        await prisma.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: { increment: receiveData.receivedQty },
            availableQty: { increment: receiveData.receivedQty }
          }
        });
      } else {
        await prisma.stock.create({
          data: {
            productId: item.productId,
            batchId,
            warehouseId: order.warehouseId,
            quantity: receiveData.receivedQty,
            reservedQty: 0,
            availableQty: receiveData.receivedQty
          }
        });
      }

      // Update received quantity
      await prisma.purchaseOrderItem.update({
        where: { id: itemId },
        data: {
          receivedQty: { increment: receiveData.receivedQty }
        }
      });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.RECEIVED,
        receivedDate: new Date()
      },
      include: {
        items: { include: { product: true } }
      }
    });

    logger.info(`Purchase order received: ${order.orderNumber} by user ${receivedBy}`);
    return updated;
  }

  /**
   * Cancel purchase order
   */
  async cancel(id: string, cancelledBy: string, reason?: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid purchase order ID');

    const order = await prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null }
    });
    if (!order) throw new Error('Purchase order not found');

    if ([PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED].includes(order.status)) {
      throw new Error('Cannot cancel purchase order in current status');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
        notes: reason ? `${order.notes || ''}\n\nCancelled: ${reason}` : order.notes,
        updatedAt: new Date()
      },
      include: {
        items: { include: { product: true } }
      }
    });

    logger.info(`Purchase order cancelled: ${order.orderNumber} by user ${cancelledBy}`);
    return updated;
  }

  /**
   * Get purchase order statistics
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const where: any = { deletedAt: null };

    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) where.orderDate.gte = dateFrom;
      if (dateTo) where.orderDate.lte = dateTo;
    }

    const [total, byStatus, totalValue] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.purchaseOrder.aggregate({
        where: { ...where, status: { not: PurchaseOrderStatus.CANCELLED } },
        _sum: { grandTotal: true }
      })
    ]);

    const statusCounts = byStatus.reduce((acc: any, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    return {
      total,
      byStatus: statusCounts,
      totalValue: totalValue._sum.grandTotal || 0
    };
  }

  /**
   * Helper: Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await prisma.purchaseOrder.count({
      where: {
        createdAt: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `PO-${year}${month}${day}-${sequence}`;
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
