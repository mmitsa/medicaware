import { PrismaClient, TransferStatus, MovementType } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface TransferOrderFilters {
  status?: TransferStatus;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  createdById?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CreateTransferOrderData {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  items: TransferOrderItemData[];
}

export interface TransferOrderItemData {
  productId: string;
  batchId?: string;
  requestedQty: number;
  notes?: string;
}

export class TransferOrderService {
  /**
   * Get all transfer orders with pagination and filtering
   */
  async getAll(page: number = 1, limit: number = 20, filters?: TransferOrderFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

    if (filters?.status) where.status = filters.status;
    if (filters?.fromWarehouseId) {
      if (!ValidationUtil.isValidUUID(filters.fromWarehouseId)) {
        throw new Error('Invalid from warehouse ID');
      }
      where.fromWarehouseId = filters.fromWarehouseId;
    }
    if (filters?.toWarehouseId) {
      if (!ValidationUtil.isValidUUID(filters.toWarehouseId)) {
        throw new Error('Invalid to warehouse ID');
      }
      where.toWarehouseId = filters.toWarehouseId;
    }
    if (filters?.createdById) where.createdById = filters.createdById;

    if (filters?.dateFrom || filters?.dateTo) {
      where.requestDate = {};
      if (filters.dateFrom) where.requestDate.gte = filters.dateFrom;
      if (filters.dateTo) where.requestDate.lte = filters.dateTo;
    }

    const [orders, total] = await Promise.all([
      prisma.transferOrder.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
          fromWarehouse: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true
            }
          },
          toWarehouse: {
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
                  nameAr: true,
                  unitOfMeasure: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transferOrder.count({ where })
    ]);

    return PaginationUtil.createResponse(orders, total, page, parsedLimit);
  }

  /**
   * Get transfer order by ID
   */
  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
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

    if (!order) throw new Error('Transfer order not found');

    return order;
  }

  /**
   * Create new transfer order
   */
  async create(data: CreateTransferOrderData, createdById: string) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'fromWarehouseId',
      'toWarehouseId',
      'items'
    ]);
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Validate UUIDs
    if (!ValidationUtil.isValidUUID(data.fromWarehouseId)) {
      throw new Error('Invalid from warehouse ID');
    }
    if (!ValidationUtil.isValidUUID(data.toWarehouseId)) {
      throw new Error('Invalid to warehouse ID');
    }

    // Cannot transfer to same warehouse
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new Error('Cannot transfer to the same warehouse');
    }

    // Validate items
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('At least one item is required');
    }

    // Check warehouses exist
    const [fromWarehouse, toWarehouse] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: data.fromWarehouseId, deletedAt: null } }),
      prisma.warehouse.findFirst({ where: { id: data.toWarehouseId, deletedAt: null } })
    ]);

    if (!fromWarehouse) throw new Error('From warehouse not found');
    if (!toWarehouse) throw new Error('To warehouse not found');

    // Validate all products exist
    for (const item of data.items) {
      if (!ValidationUtil.isValidUUID(item.productId)) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }
      if (item.requestedQty <= 0) {
        throw new Error('Requested quantity must be greater than 0');
      }

      const product = await prisma.product.findFirst({
        where: { id: item.productId, deletedAt: null }
      });
      if (!product) throw new Error(`Product not found: ${item.productId}`);
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Create transfer order with items
    const order = await prisma.transferOrder.create({
      data: {
        orderNumber,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        notes: data.notes,
        createdById,
        status: TransferStatus.DRAFT,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            requestedQty: item.requestedQty,
            notes: item.notes
          }))
        }
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    logger.info(
      `Transfer order created: ${orderNumber} from ${fromWarehouse.code} to ${toWarehouse.code} by user ${createdById}`
    );

    return order;
  }

  /**
   * Update transfer order (only in DRAFT status)
   */
  async update(id: string, data: Partial<CreateTransferOrderData>, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null }
    });
    if (!order) throw new Error('Transfer order not found');

    if (order.status !== TransferStatus.DRAFT) {
      throw new Error('Can only update transfer orders in DRAFT status');
    }

    // Cannot change warehouses if items exist
    if ((data.fromWarehouseId || data.toWarehouseId) && order.items) {
      throw new Error('Cannot change warehouses when items exist. Delete items first.');
    }

    const updateData: any = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.fromWarehouseId) updateData.fromWarehouseId = data.fromWarehouseId;
    if (data.toWarehouseId) updateData.toWarehouseId = data.toWarehouseId;

    const updated = await prisma.transferOrder.update({
      where: { id },
      data: updateData,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: { product: true }
        }
      }
    });

    logger.info(`Transfer order updated: ${order.orderNumber} by user ${userId}`);
    return updated;
  }

  /**
   * Submit transfer order for approval
   */
  async submit(id: string, userId: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: true }
    });
    if (!order) throw new Error('Transfer order not found');

    if (order.status !== TransferStatus.DRAFT) {
      throw new Error('Can only submit transfer orders in DRAFT status');
    }

    if (!order.items || order.items.length === 0) {
      throw new Error('Cannot submit transfer order without items');
    }

    const updated = await prisma.transferOrder.update({
      where: { id },
      data: { status: TransferStatus.PENDING },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`Transfer order submitted: ${order.orderNumber} by user ${userId}`);
    return updated;
  }

  /**
   * Approve transfer order
   */
  async approve(id: string, approvedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: { product: true }
        },
        fromWarehouse: true
      }
    });
    if (!order) throw new Error('Transfer order not found');

    if (order.status !== TransferStatus.PENDING) {
      throw new Error('Can only approve transfer orders in PENDING status');
    }

    // Check stock availability for all items
    for (const item of order.items) {
      const stock = await prisma.stock.findFirst({
        where: {
          productId: item.productId,
          warehouseId: order.fromWarehouseId,
          ...(item.batchId && { batchId: item.batchId }),
          deletedAt: null
        }
      });

      if (!stock || stock.availableQty < item.requestedQty) {
        throw new Error(
          `Insufficient stock for product ${item.product.code}. Available: ${stock?.availableQty || 0}, Requested: ${item.requestedQty}`
        );
      }
    }

    // Reserve stock for all items
    for (const item of order.items) {
      await prisma.stock.updateMany({
        where: {
          productId: item.productId,
          warehouseId: order.fromWarehouseId,
          ...(item.batchId && { batchId: item.batchId }),
          deletedAt: null
        },
        data: {
          reservedQty: { increment: item.requestedQty },
          availableQty: { decrement: item.requestedQty }
        }
      });

      // Update approved quantity
      await prisma.transferOrderItem.update({
        where: { id: item.id },
        data: { approvedQty: item.requestedQty }
      });
    }

    const updated = await prisma.transferOrder.update({
      where: { id },
      data: {
        status: TransferStatus.APPROVED,
        approvedDate: new Date(),
        approvedBy
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`Transfer order approved: ${order.orderNumber} by user ${approvedBy}`);
    return updated;
  }

  /**
   * Reject transfer order
   */
  async reject(id: string, rejectionReason: string, rejectedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null }
    });
    if (!order) throw new Error('Transfer order not found');

    if (order.status !== TransferStatus.PENDING) {
      throw new Error('Can only reject transfer orders in PENDING status');
    }

    const updated = await prisma.transferOrder.update({
      where: { id },
      data: {
        status: TransferStatus.REJECTED,
        rejectionReason
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`Transfer order rejected: ${order.orderNumber} by user ${rejectedBy}. Reason: ${rejectionReason}`);
    return updated;
  }

  /**
   * Ship transfer order (creates stock movements)
   */
  async ship(id: string, shippedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: { product: true }
        },
        fromWarehouse: true,
        toWarehouse: true
      }
    });
    if (!order) throw new Error('Transfer order not found');

    if (order.status !== TransferStatus.APPROVED) {
      throw new Error('Can only ship transfer orders in APPROVED status');
    }

    // Create TRANSFER_OUT movements for from warehouse
    for (const item of order.items) {
      const movementNumber = await this.generateMovementNumber();

      // Deduct from source warehouse (release reservation and reduce stock)
      await prisma.stock.updateMany({
        where: {
          productId: item.productId,
          warehouseId: order.fromWarehouseId,
          ...(item.batchId && { batchId: item.batchId }),
          deletedAt: null
        },
        data: {
          quantity: { decrement: item.approvedQty! },
          reservedQty: { decrement: item.approvedQty! }
        }
      });

      // Create stock movement
      await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: MovementType.TRANSFER_OUT,
          productId: item.productId,
          batchId: item.batchId,
          warehouseId: order.fromWarehouseId,
          quantity: -item.approvedQty!,
          referenceType: 'TRANSFER_ORDER',
          referenceId: order.id,
          notes: `Transfer to ${order.toWarehouse.name}`,
          userId: shippedBy,
          createdBy: shippedBy
        }
      });
    }

    const updated = await prisma.transferOrder.update({
      where: { id },
      data: {
        status: TransferStatus.IN_TRANSIT,
        shippedDate: new Date()
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`Transfer order shipped: ${order.orderNumber} by user ${shippedBy}`);
    return updated;
  }

  /**
   * Receive transfer order (creates stock movements)
   */
  async receive(id: string, receivedBy: string, receivedQuantities?: { [itemId: string]: number }) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: { product: true }
        },
        fromWarehouse: true,
        toWarehouse: true
      }
    });
    if (!order) throw new Error('Transfer order not found');

    if (order.status !== TransferStatus.IN_TRANSIT) {
      throw new Error('Can only receive transfer orders in IN_TRANSIT status');
    }

    // Create TRANSFER_IN movements for destination warehouse
    for (const item of order.items) {
      const receivedQty = receivedQuantities?.[item.id] ?? item.approvedQty!;

      if (receivedQty < 0 || receivedQty > item.approvedQty!) {
        throw new Error(
          `Invalid received quantity for ${item.product.code}. Must be between 0 and ${item.approvedQty}`
        );
      }

      const movementNumber = await this.generateMovementNumber();

      // Add to destination warehouse
      const existingStock = await prisma.stock.findFirst({
        where: {
          productId: item.productId,
          warehouseId: order.toWarehouseId,
          ...(item.batchId && { batchId: item.batchId }),
          deletedAt: null
        }
      });

      if (existingStock) {
        await prisma.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: { increment: receivedQty },
            availableQty: { increment: receivedQty }
          }
        });
      } else {
        await prisma.stock.create({
          data: {
            productId: item.productId,
            batchId: item.batchId,
            warehouseId: order.toWarehouseId,
            quantity: receivedQty,
            reservedQty: 0,
            availableQty: receivedQty
          }
        });
      }

      // Create stock movement
      await prisma.stockMovement.create({
        data: {
          movementNumber,
          type: MovementType.TRANSFER_IN,
          productId: item.productId,
          batchId: item.batchId,
          warehouseId: order.toWarehouseId,
          quantity: receivedQty,
          referenceType: 'TRANSFER_ORDER',
          referenceId: order.id,
          notes: `Transfer from ${order.fromWarehouse.name}`,
          userId: receivedBy,
          createdBy: receivedBy
        }
      });

      // Update received quantity
      await prisma.transferOrderItem.update({
        where: { id: item.id },
        data: { receivedQty }
      });
    }

    const updated = await prisma.transferOrder.update({
      where: { id },
      data: {
        status: TransferStatus.RECEIVED,
        receivedDate: new Date()
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`Transfer order received: ${order.orderNumber} by user ${receivedBy}`);
    return updated;
  }

  /**
   * Cancel transfer order
   */
  async cancel(id: string, cancelledBy: string, reason?: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid transfer order ID');

    const order = await prisma.transferOrder.findFirst({
      where: { id, deletedAt: null },
      include: { items: true }
    });
    if (!order) throw new Error('Transfer order not found');

    if ([TransferStatus.RECEIVED, TransferStatus.CANCELLED].includes(order.status)) {
      throw new Error('Cannot cancel transfer order in current status');
    }

    // Release reserved stock if order was approved
    if (order.status === TransferStatus.APPROVED || order.status === TransferStatus.IN_TRANSIT) {
      for (const item of order.items) {
        if (item.approvedQty) {
          await prisma.stock.updateMany({
            where: {
              productId: item.productId,
              warehouseId: order.fromWarehouseId,
              ...(item.batchId && { batchId: item.batchId }),
              deletedAt: null
            },
            data: {
              reservedQty: { decrement: item.approvedQty },
              availableQty: { increment: item.approvedQty }
            }
          });
        }
      }
    }

    const updated = await prisma.transferOrder.update({
      where: { id },
      data: {
        status: TransferStatus.CANCELLED,
        rejectionReason: reason,
        updatedAt: new Date()
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: { include: { product: true } }
      }
    });

    logger.info(`Transfer order cancelled: ${order.orderNumber} by user ${cancelledBy}`);
    return updated;
  }

  /**
   * Get transfer order statistics
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const where: any = { deletedAt: null };

    if (dateFrom || dateTo) {
      where.requestDate = {};
      if (dateFrom) where.requestDate.gte = dateFrom;
      if (dateTo) where.requestDate.lte = dateTo;
    }

    const [total, byStatus] = await Promise.all([
      prisma.transferOrder.count({ where }),
      prisma.transferOrder.groupBy({
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
   * Helper: Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await prisma.transferOrder.count({
      where: {
        createdAt: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `TO-${year}${month}${day}-${sequence}`;
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
