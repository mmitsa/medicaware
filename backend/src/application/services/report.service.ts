import { prisma } from '../../index';
import { Prisma } from '@prisma/client';

export class ReportService {
  /**
   * Stock Reports
   */

  // Current stock levels report
  async getStockLevelsReport(filters?: {
    warehouseId?: string;
    productId?: string;
    categoryId?: string;
    status?: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  }) {
    const where: Prisma.StockWhereInput = {
      deletedAt: null,
      ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters?.productId && { productId: filters.productId }),
      ...(filters?.categoryId && { product: { categoryId: filters.categoryId } })
    };

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        product: {
          include: {
            category: true
          }
        },
        warehouse: true,
        batch: true
      },
      orderBy: [
        { warehouse: { name: 'asc' } },
        { product: { name: 'asc' } }
      ]
    });

    const reportData = stocks.map(stock => {
      const status = this.getStockStatus(stock.quantity, stock.product.minStockLevel);
      const value = Number(stock.quantity) * Number(stock.product.unitPrice);

      return {
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouse.name,
        warehouseNameAr: stock.warehouse.nameAr,
        productId: stock.productId,
        productName: stock.product.name,
        productNameAr: stock.product.nameAr,
        productCode: stock.product.code,
        category: stock.product.category.name,
        categoryAr: stock.product.category.nameAr,
        batchNumber: stock.batch?.batchNumber,
        expiryDate: stock.batch?.expiryDate,
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        availableQuantity: stock.quantity - stock.reservedQuantity,
        minStockLevel: stock.product.minStockLevel,
        unitPrice: stock.product.unitPrice,
        value,
        status,
        lastUpdated: stock.updatedAt
      };
    }).filter(item => {
      if (!filters?.status) return true;
      return item.status === filters.status;
    });

    const summary = {
      totalItems: reportData.length,
      totalQuantity: reportData.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: reportData.reduce((sum, item) => sum + item.value, 0),
      byStatus: {
        ok: reportData.filter(item => item.status === 'OK').length,
        low: reportData.filter(item => item.status === 'LOW').length,
        critical: reportData.filter(item => item.status === 'CRITICAL').length,
        outOfStock: reportData.filter(item => item.status === 'OUT_OF_STOCK').length
      }
    };

    return {
      summary,
      data: reportData,
      generatedAt: new Date()
    };
  }

  // Low stock report
  async getLowStockReport(warehouseId?: string) {
    const where: Prisma.StockWhereInput = {
      deletedAt: null,
      ...(warehouseId && { warehouseId })
    };

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        product: true,
        warehouse: true
      }
    });

    const lowStockItems = stocks.filter(stock => {
      const availableQuantity = stock.quantity - stock.reservedQuantity;
      return availableQuantity <= stock.product.minStockLevel;
    }).map(stock => {
      const availableQuantity = stock.quantity - stock.reservedQuantity;
      const deficit = stock.product.minStockLevel - availableQuantity;

      return {
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouse.name,
        productId: stock.productId,
        productName: stock.product.name,
        productNameAr: stock.product.nameAr,
        productCode: stock.product.code,
        currentQuantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        availableQuantity,
        minStockLevel: stock.product.minStockLevel,
        deficit,
        status: availableQuantity === 0 ? 'OUT_OF_STOCK' :
                availableQuantity <= stock.product.minStockLevel * 0.25 ? 'CRITICAL' : 'LOW',
        recommendedOrderQuantity: Math.ceil(deficit * 1.5) // Order 50% more than deficit
      };
    });

    return {
      summary: {
        totalLowStockItems: lowStockItems.length,
        outOfStockItems: lowStockItems.filter(item => item.status === 'OUT_OF_STOCK').length,
        criticalItems: lowStockItems.filter(item => item.status === 'CRITICAL').length
      },
      data: lowStockItems,
      generatedAt: new Date()
    };
  }

  // Expiry report (items expiring soon)
  async getExpiryReport(daysAhead: number = 90, warehouseId?: string) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const where: Prisma.BatchWhereInput = {
      deletedAt: null,
      expiryDate: {
        lte: futureDate,
        gte: new Date()
      }
    };

    const batches = await prisma.batch.findMany({
      where,
      include: {
        product: true,
        stocks: {
          where: {
            deletedAt: null,
            quantity: { gt: 0 },
            ...(warehouseId && { warehouseId })
          },
          include: {
            warehouse: true
          }
        }
      },
      orderBy: {
        expiryDate: 'asc'
      }
    });

    const expiryData = batches.flatMap(batch =>
      batch.stocks.map(stock => {
        const daysUntilExpiry = Math.ceil(
          (batch.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const value = Number(stock.quantity) * Number(batch.product.unitPrice);

        return {
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          productId: batch.productId,
          productName: batch.product.name,
          productNameAr: batch.product.nameAr,
          productCode: batch.product.code,
          warehouseId: stock.warehouseId,
          warehouseName: stock.warehouse.name,
          quantity: stock.quantity,
          expiryDate: batch.expiryDate,
          daysUntilExpiry,
          unitPrice: batch.product.unitPrice,
          value,
          urgency: daysUntilExpiry <= 30 ? 'CRITICAL' :
                   daysUntilExpiry <= 60 ? 'HIGH' : 'MEDIUM'
        };
      })
    );

    const summary = {
      totalItems: expiryData.length,
      totalQuantity: expiryData.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: expiryData.reduce((sum, item) => sum + item.value, 0),
      byUrgency: {
        critical: expiryData.filter(item => item.urgency === 'CRITICAL').length,
        high: expiryData.filter(item => item.urgency === 'HIGH').length,
        medium: expiryData.filter(item => item.urgency === 'MEDIUM').length
      }
    };

    return {
      summary,
      data: expiryData,
      generatedAt: new Date()
    };
  }

  // Stock valuation report
  async getStockValuationReport(warehouseId?: string) {
    const where: Prisma.StockWhereInput = {
      deletedAt: null,
      quantity: { gt: 0 },
      ...(warehouseId && { warehouseId })
    };

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        product: {
          include: {
            category: true
          }
        },
        warehouse: true
      }
    });

    const valuationData = stocks.map(stock => {
      const value = Number(stock.quantity) * Number(stock.product.unitPrice);
      return {
        warehouseId: stock.warehouseId,
        warehouseName: stock.warehouse.name,
        productId: stock.productId,
        productName: stock.product.name,
        productCode: stock.product.code,
        category: stock.product.category.name,
        quantity: stock.quantity,
        unitPrice: stock.product.unitPrice,
        value
      };
    });

    // Group by warehouse
    const byWarehouse = valuationData.reduce((acc, item) => {
      if (!acc[item.warehouseId]) {
        acc[item.warehouseId] = {
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName,
          totalValue: 0,
          itemCount: 0
        };
      }
      acc[item.warehouseId].totalValue += item.value;
      acc[item.warehouseId].itemCount++;
      return acc;
    }, {} as Record<string, any>);

    // Group by category
    const byCategory = valuationData.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          category: item.category,
          totalValue: 0,
          itemCount: 0
        };
      }
      acc[item.category].totalValue += item.value;
      acc[item.category].itemCount++;
      return acc;
    }, {} as Record<string, any>);

    const totalValue = valuationData.reduce((sum, item) => sum + item.value, 0);

    return {
      summary: {
        totalValue,
        totalItems: valuationData.length,
        byWarehouse: Object.values(byWarehouse),
        byCategory: Object.values(byCategory)
      },
      data: valuationData,
      generatedAt: new Date()
    };
  }

  /**
   * Movement Reports
   */

  async getStockMovementReport(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    warehouseId?: string;
    productId?: string;
    type?: string;
  }) {
    const where: Prisma.StockMovementWhereInput = {
      deletedAt: null,
      ...(filters.dateFrom && { movementDate: { gte: filters.dateFrom } }),
      ...(filters.dateTo && { movementDate: { lte: filters.dateTo } }),
      ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters.productId && { productId: filters.productId }),
      ...(filters.type && { type: filters.type as any })
    };

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { movementDate: 'desc' }
    });

    const reportData = movements.map(movement => ({
      id: movement.id,
      movementNumber: movement.movementNumber,
      type: movement.type,
      productId: movement.productId,
      productName: movement.product.name,
      productCode: movement.product.code,
      warehouseId: movement.warehouseId,
      warehouseName: movement.warehouse.name,
      quantity: movement.quantity,
      batchNumber: movement.batchNumber,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      movementDate: movement.movementDate,
      notes: movement.notes,
      createdBy: movement.createdBy ?
        `${movement.createdBy.firstName} ${movement.createdBy.lastName}` : null
    }));

    // Summary by type
    const byType = movements.reduce((acc, movement) => {
      if (!acc[movement.type]) {
        acc[movement.type] = { type: movement.type, count: 0, totalQuantity: 0 };
      }
      acc[movement.type].count++;
      acc[movement.type].totalQuantity += movement.quantity;
      return acc;
    }, {} as Record<string, any>);

    // Summary by warehouse
    const byWarehouse = movements.reduce((acc, movement) => {
      const key = movement.warehouseId;
      if (!acc[key]) {
        acc[key] = {
          warehouseId: movement.warehouseId,
          warehouseName: movement.warehouse.name,
          count: 0
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, any>);

    return {
      summary: {
        totalMovements: movements.length,
        dateRange: {
          from: filters.dateFrom || movements[movements.length - 1]?.movementDate,
          to: filters.dateTo || movements[0]?.movementDate
        },
        byType: Object.values(byType),
        byWarehouse: Object.values(byWarehouse)
      },
      data: reportData,
      generatedAt: new Date()
    };
  }

  /**
   * Transfer Order Reports
   */

  async getTransferOrderReport(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    status?: string;
  }) {
    const where: Prisma.TransferOrderWhereInput = {
      deletedAt: null,
      ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
      ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
      ...(filters.fromWarehouseId && { fromWarehouseId: filters.fromWarehouseId }),
      ...(filters.toWarehouseId && { toWarehouseId: filters.toWarehouseId }),
      ...(filters.status && { status: filters.status as any })
    };

    const transfers = await prisma.transferOrder.findMany({
      where,
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        items: {
          include: {
            product: true
          }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const reportData = transfers.map(transfer => {
      const totalItems = transfer.items.reduce((sum, item) => sum + item.quantity, 0);
      const receivedItems = transfer.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);

      return {
        id: transfer.id,
        transferNumber: transfer.transferNumber,
        status: transfer.status,
        fromWarehouseId: transfer.fromWarehouseId,
        fromWarehouseName: transfer.fromWarehouse.name,
        toWarehouseId: transfer.toWarehouseId,
        toWarehouseName: transfer.toWarehouse.name,
        itemCount: transfer.items.length,
        totalQuantity: totalItems,
        receivedQuantity: receivedItems,
        requestedDate: transfer.requestedDate,
        approvedDate: transfer.approvedDate,
        shippedDate: transfer.shippedDate,
        receivedDate: transfer.receivedDate,
        createdBy: transfer.createdBy ?
          `${transfer.createdBy.firstName} ${transfer.createdBy.lastName}` : null,
        createdAt: transfer.createdAt
      };
    });

    const byStatus = transfers.reduce((acc, transfer) => {
      if (!acc[transfer.status]) {
        acc[transfer.status] = { status: transfer.status, count: 0 };
      }
      acc[transfer.status].count++;
      return acc;
    }, {} as Record<string, any>);

    const totalQuantity = reportData.reduce((sum, item) => sum + item.totalQuantity, 0);

    return {
      summary: {
        totalOrders: transfers.length,
        totalQuantity,
        byStatus: Object.values(byStatus),
        dateRange: {
          from: filters.dateFrom || transfers[transfers.length - 1]?.createdAt,
          to: filters.dateTo || transfers[0]?.createdAt
        }
      },
      data: reportData,
      generatedAt: new Date()
    };
  }

  /**
   * Purchase Order Reports
   */

  async getPurchaseOrderReport(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    supplierId?: string;
    status?: string;
  }) {
    const where: Prisma.PurchaseOrderWhereInput = {
      deletedAt: null,
      ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
      ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.status && { status: filters.status as any })
    };

    const purchases = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const reportData = purchases.map(purchase => {
      const totalItems = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
      const receivedItems = purchase.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);

      return {
        id: purchase.id,
        orderNumber: purchase.orderNumber,
        status: purchase.status,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplier.name,
        supplierNameAr: purchase.supplier.nameAr,
        itemCount: purchase.items.length,
        totalQuantity: totalItems,
        receivedQuantity: receivedItems,
        totalAmount: purchase.totalAmount,
        taxAmount: purchase.taxAmount,
        grandTotal: purchase.grandTotal,
        orderDate: purchase.orderDate,
        expectedDeliveryDate: purchase.expectedDeliveryDate,
        receivedDate: purchase.receivedDate,
        createdBy: purchase.createdBy ?
          `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}` : null,
        createdAt: purchase.createdAt
      };
    });

    const byStatus = purchases.reduce((acc, purchase) => {
      if (!acc[purchase.status]) {
        acc[purchase.status] = {
          status: purchase.status,
          count: 0,
          totalAmount: 0
        };
      }
      acc[purchase.status].count++;
      acc[purchase.status].totalAmount += Number(purchase.grandTotal);
      return acc;
    }, {} as Record<string, any>);

    const bySupplier = purchases.reduce((acc, purchase) => {
      const key = purchase.supplierId;
      if (!acc[key]) {
        acc[key] = {
          supplierId: purchase.supplierId,
          supplierName: purchase.supplier.name,
          count: 0,
          totalAmount: 0
        };
      }
      acc[key].count++;
      acc[key].totalAmount += Number(purchase.grandTotal);
      return acc;
    }, {} as Record<string, any>);

    const totalSpending = purchases.reduce((sum, purchase) => sum + Number(purchase.grandTotal), 0);
    const totalTax = purchases.reduce((sum, purchase) => sum + Number(purchase.taxAmount), 0);

    return {
      summary: {
        totalOrders: purchases.length,
        totalSpending,
        totalTax,
        byStatus: Object.values(byStatus),
        bySupplier: Object.values(bySupplier),
        dateRange: {
          from: filters.dateFrom || purchases[purchases.length - 1]?.createdAt,
          to: filters.dateTo || purchases[0]?.createdAt
        }
      },
      data: reportData,
      generatedAt: new Date()
    };
  }

  /**
   * Product Analytics
   */

  async getProductAnalytics(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    warehouseId?: string;
    limit?: number;
  }) {
    const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const dateTo = filters.dateTo || new Date();

    // Get all movements for the period
    const movements = await prisma.stockMovement.findMany({
      where: {
        deletedAt: null,
        movementDate: { gte: dateFrom, lte: dateTo },
        ...(filters.warehouseId && { warehouseId: filters.warehouseId })
      },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    // Calculate metrics per product
    const productMetrics = movements.reduce((acc, movement) => {
      const productId = movement.productId;
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName: movement.product.name,
          productCode: movement.product.code,
          category: movement.product.category.name,
          inboundMovements: 0,
          outboundMovements: 0,
          inboundQuantity: 0,
          outboundQuantity: 0,
          turnoverRate: 0
        };
      }

      const isInbound = ['RECEIPT', 'TRANSFER_IN', 'RETURN', 'FOUND', 'ADJUSTMENT'].includes(movement.type);

      if (isInbound) {
        acc[productId].inboundMovements++;
        acc[productId].inboundQuantity += movement.quantity;
      } else {
        acc[productId].outboundMovements++;
        acc[productId].outboundQuantity += movement.quantity;
      }

      return acc;
    }, {} as Record<string, any>);

    // Get current stock for turnover calculation
    const stocks = await prisma.stock.findMany({
      where: {
        deletedAt: null,
        productId: { in: Object.keys(productMetrics) },
        ...(filters.warehouseId && { warehouseId: filters.warehouseId })
      },
      include: {
        product: true
      }
    });

    // Calculate turnover rate
    const stockByProduct = stocks.reduce((acc, stock) => {
      if (!acc[stock.productId]) {
        acc[stock.productId] = 0;
      }
      acc[stock.productId] += stock.quantity;
      return acc;
    }, {} as Record<string, number>);

    Object.keys(productMetrics).forEach(productId => {
      const avgStock = stockByProduct[productId] || 0;
      const outbound = productMetrics[productId].outboundQuantity;

      // Turnover rate = (outbound quantity / average stock) * (365 / days in period)
      const daysInPeriod = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      productMetrics[productId].turnoverRate = avgStock > 0
        ? (outbound / avgStock) * (365 / daysInPeriod)
        : 0;
    });

    const analyticsData = Object.values(productMetrics);

    // Sort by different criteria
    const topMoving = [...analyticsData]
      .sort((a, b) => b.outboundQuantity - a.outboundQuantity)
      .slice(0, filters.limit || 20);

    const slowMoving = [...analyticsData]
      .sort((a, b) => a.outboundQuantity - b.outboundQuantity)
      .filter(p => p.outboundQuantity > 0)
      .slice(0, filters.limit || 20);

    const highTurnover = [...analyticsData]
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, filters.limit || 20);

    return {
      summary: {
        totalProducts: analyticsData.length,
        dateRange: { from: dateFrom, to: dateTo },
        totalInboundQuantity: analyticsData.reduce((sum, p) => sum + p.inboundQuantity, 0),
        totalOutboundQuantity: analyticsData.reduce((sum, p) => sum + p.outboundQuantity, 0)
      },
      topMovingProducts: topMoving,
      slowMovingProducts: slowMoving,
      highTurnoverProducts: highTurnover,
      generatedAt: new Date()
    };
  }

  /**
   * Dashboard Summary
   */

  async getDashboardSummary(warehouseId?: string) {
    // Get counts
    const [
      totalWarehouses,
      totalProducts,
      totalUsers,
      activeTransfers,
      pendingPurchases
    ] = await Promise.all([
      prisma.warehouse.count({ where: { deletedAt: null, isActive: true } }),
      prisma.product.count({ where: { deletedAt: null, isActive: true } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.transferOrder.count({
        where: {
          deletedAt: null,
          status: { in: ['PENDING', 'APPROVED', 'IN_TRANSIT'] }
        }
      }),
      prisma.purchaseOrder.count({
        where: {
          deletedAt: null,
          status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED'] }
        }
      })
    ]);

    // Get stock summary
    const stocks = await prisma.stock.findMany({
      where: {
        deletedAt: null,
        ...(warehouseId && { warehouseId })
      },
      include: {
        product: true
      }
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;

    stocks.forEach(stock => {
      const availableQty = stock.quantity - stock.reservedQuantity;
      if (availableQty === 0) outOfStockCount++;
      else if (availableQty <= stock.product.minStockLevel) lowStockCount++;

      totalStockValue += Number(stock.quantity) * Number(stock.product.unitPrice);
    });

    // Recent movements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMovements = await prisma.stockMovement.count({
      where: {
        deletedAt: null,
        movementDate: { gte: sevenDaysAgo },
        ...(warehouseId && { warehouseId })
      }
    });

    return {
      inventory: {
        totalProducts,
        totalStockValue,
        lowStockCount,
        outOfStockCount
      },
      operations: {
        activeTransfers,
        pendingPurchases,
        recentMovements
      },
      system: {
        totalWarehouses,
        totalUsers
      },
      generatedAt: new Date()
    };
  }

  /**
   * Helper Methods
   */

  private getStockStatus(quantity: number, minStockLevel: number): string {
    if (quantity === 0) return 'OUT_OF_STOCK';
    if (quantity <= minStockLevel * 0.25) return 'CRITICAL';
    if (quantity <= minStockLevel) return 'LOW';
    return 'OK';
  }
}
