import { prisma } from '../../index';
import { Prisma } from '@prisma/client';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CREDIT_NOTE = 'CREDIT_NOTE'
}

export class FinancialService {
  /**
   * Payment Management
   */

  async createPayment(data: {
    purchaseOrderId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate?: Date;
    referenceNumber?: string;
    notes?: string;
  }, createdById: string) {
    // Verify purchase order exists
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: data.purchaseOrderId,
        deletedAt: null
      }
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    // Get existing payments
    const existingPayments = await prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(amount), 0) as totalPaid
      FROM Payment
      WHERE purchaseOrderId = ${data.purchaseOrderId}
      AND deletedAt IS NULL
    `;

    const totalPaid = Number(existingPayments[0]?.totalPaid || 0);
    const remaining = Number(purchaseOrder.grandTotal) - totalPaid;

    if (data.amount > remaining) {
      throw new Error(`Payment amount (${data.amount}) exceeds remaining balance (${remaining})`);
    }

    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Create payment record
    const payment = await prisma.$executeRaw`
      INSERT INTO Payment (
        id, purchaseOrderId, amount, paymentMethod, paymentDate,
        referenceNumber, notes, createdById, createdAt, updatedAt
      ) VALUES (
        ${this.generateId()},
        ${data.purchaseOrderId},
        ${data.amount},
        ${data.paymentMethod},
        ${data.paymentDate || new Date()},
        ${data.referenceNumber || null},
        ${data.notes || null},
        ${createdById},
        ${new Date()},
        ${new Date()}
      )
    `;

    // Get the created payment
    const createdPayment = await prisma.$queryRaw<any[]>`
      SELECT * FROM Payment
      WHERE purchaseOrderId = ${data.purchaseOrderId}
      AND createdById = ${createdById}
      AND deletedAt IS NULL
      ORDER BY createdAt DESC
      LIMIT 1
    `;

    return createdPayment[0];
  }

  async getPaymentsByPurchaseOrder(purchaseOrderId: string) {
    const payments = await prisma.$queryRaw<any[]>`
      SELECT p.*, u.firstName, u.lastName
      FROM Payment p
      LEFT JOIN User u ON p.createdById = u.id
      WHERE p.purchaseOrderId = ${purchaseOrderId}
      AND p.deletedAt IS NULL
      ORDER BY p.paymentDate DESC
    `;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, deletedAt: null }
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(purchaseOrder.grandTotal) - totalPaid;

    return {
      payments,
      summary: {
        totalAmount: purchaseOrder.grandTotal,
        totalPaid,
        remaining,
        status: this.calculatePaymentStatus(
          Number(purchaseOrder.grandTotal),
          totalPaid,
          purchaseOrder.expectedDeliveryDate
        )
      }
    };
  }

  async getPaymentById(id: string) {
    const payment = await prisma.$queryRaw<any[]>`
      SELECT p.*, po.orderNumber, s.name as supplierName, u.firstName, u.lastName
      FROM Payment p
      JOIN PurchaseOrder po ON p.purchaseOrderId = po.id
      JOIN Supplier s ON po.supplierId = s.id
      JOIN User u ON p.createdById = u.id
      WHERE p.id = ${id}
      AND p.deletedAt IS NULL
    `;

    if (!payment || payment.length === 0) {
      throw new Error('Payment not found');
    }

    return payment[0];
  }

  async getAllPayments(page: number = 1, limit: number = 20, filters?: {
    supplierId?: string;
    paymentMethod?: PaymentMethod;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const skip = (page - 1) * limit;

    let whereConditions = 'WHERE p.deletedAt IS NULL';
    const params: any[] = [];

    if (filters?.supplierId) {
      whereConditions += ' AND po.supplierId = ?';
      params.push(filters.supplierId);
    }

    if (filters?.paymentMethod) {
      whereConditions += ' AND p.paymentMethod = ?';
      params.push(filters.paymentMethod);
    }

    if (filters?.dateFrom) {
      whereConditions += ' AND p.paymentDate >= ?';
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      whereConditions += ' AND p.paymentDate <= ?';
      params.push(filters.dateTo);
    }

    // Note: Since we're using raw queries, pagination with dynamic params is complex
    // For simplicity, fetching all and slicing in memory
    const payments = await prisma.$queryRaw<any[]>`
      SELECT p.*, po.orderNumber, s.name as supplierName, u.firstName, u.lastName
      FROM Payment p
      JOIN PurchaseOrder po ON p.purchaseOrderId = po.id
      JOIN Supplier s ON po.supplierId = s.id
      JOIN User u ON p.createdById = u.id
      ${Prisma.raw(whereConditions)}
      ORDER BY p.paymentDate DESC
    `;

    const total = payments.length;
    const paginatedData = payments.slice(skip, skip + limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async deletePayment(id: string, deletedById: string) {
    const payment = await this.getPaymentById(id);

    await prisma.$executeRaw`
      UPDATE Payment
      SET deletedAt = ${new Date()}, updatedById = ${deletedById}, updatedAt = ${new Date()}
      WHERE id = ${id}
    `;

    return { message: 'Payment deleted successfully' };
  }

  /**
   * Accounts Payable Management
   */

  async getAccountsPayable(filters?: {
    supplierId?: string;
    status?: PaymentStatus;
    overdueDays?: number;
  }) {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        deletedAt: null,
        status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] },
        ...(filters?.supplierId && { supplierId: filters.supplierId })
      },
      include: {
        supplier: true
      },
      orderBy: { expectedDeliveryDate: 'asc' }
    });

    const accountsPayable = await Promise.all(
      purchaseOrders.map(async (po) => {
        const payments = await prisma.$queryRaw<any[]>`
          SELECT COALESCE(SUM(amount), 0) as totalPaid
          FROM Payment
          WHERE purchaseOrderId = ${po.id}
          AND deletedAt IS NULL
        `;

        const totalPaid = Number(payments[0]?.totalPaid || 0);
        const remaining = Number(po.grandTotal) - totalPaid;
        const status = this.calculatePaymentStatus(
          Number(po.grandTotal),
          totalPaid,
          po.expectedDeliveryDate
        );

        const daysOverdue = po.expectedDeliveryDate
          ? Math.max(0, Math.ceil((new Date().getTime() - po.expectedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        return {
          purchaseOrderId: po.id,
          orderNumber: po.orderNumber,
          supplierId: po.supplierId,
          supplierName: po.supplier.name,
          totalAmount: po.grandTotal,
          totalPaid,
          remaining,
          status,
          dueDate: po.expectedDeliveryDate,
          daysOverdue,
          orderDate: po.orderDate || po.createdAt
        };
      })
    );

    // Filter by status if provided
    let filtered = accountsPayable.filter(ap => ap.remaining > 0);

    if (filters?.status) {
      filtered = filtered.filter(ap => ap.status === filters.status);
    }

    if (filters?.overdueDays !== undefined) {
      filtered = filtered.filter(ap => ap.daysOverdue >= filters.overdueDays);
    }

    const summary = {
      totalPayable: filtered.reduce((sum, ap) => sum + Number(ap.remaining), 0),
      totalOverdue: filtered.filter(ap => ap.status === PaymentStatus.OVERDUE).reduce((sum, ap) => sum + Number(ap.remaining), 0),
      count: filtered.length,
      overdueCount: filtered.filter(ap => ap.status === PaymentStatus.OVERDUE).length
    };

    return {
      data: filtered,
      summary
    };
  }

  async getSupplierBalance(supplierId: string) {
    // Verify supplier exists
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null }
    });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId,
        deletedAt: null,
        status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] }
      }
    });

    let totalOwed = 0;
    let totalPaid = 0;

    for (const po of purchaseOrders) {
      const payments = await prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(amount), 0) as paid
        FROM Payment
        WHERE purchaseOrderId = ${po.id}
        AND deletedAt IS NULL
      `;

      const paid = Number(payments[0]?.paid || 0);
      totalPaid += paid;
      totalOwed += Number(po.grandTotal) - paid;
    }

    return {
      supplierId,
      supplierName: supplier.name,
      totalPurchases: purchaseOrders.reduce((sum, po) => sum + Number(po.grandTotal), 0),
      totalPaid,
      totalOwed,
      creditLimit: supplier.creditLimit,
      availableCredit: supplier.creditLimit ? Number(supplier.creditLimit) - totalOwed : null
    };
  }

  /**
   * Financial Reports
   */

  async getPaymentReport(dateFrom?: Date, dateTo?: Date) {
    const defaultDateFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const defaultDateTo = dateTo || new Date();

    const payments = await prisma.$queryRaw<any[]>`
      SELECT p.*, po.orderNumber, s.name as supplierName, s.id as supplierId
      FROM Payment p
      JOIN PurchaseOrder po ON p.purchaseOrderId = po.id
      JOIN Supplier s ON po.supplierId = s.id
      WHERE p.deletedAt IS NULL
      AND p.paymentDate >= ${defaultDateFrom}
      AND p.paymentDate <= ${defaultDateTo}
      ORDER BY p.paymentDate DESC
    `;

    // Group by supplier
    const bySupplier = payments.reduce((acc, payment) => {
      const key = payment.supplierId;
      if (!acc[key]) {
        acc[key] = {
          supplierId: payment.supplierId,
          supplierName: payment.supplierName,
          totalPaid: 0,
          paymentCount: 0
        };
      }
      acc[key].totalPaid += Number(payment.amount);
      acc[key].paymentCount++;
      return acc;
    }, {} as Record<string, any>);

    // Group by payment method
    const byMethod = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod;
      if (!acc[method]) {
        acc[method] = { method, totalPaid: 0, count: 0 };
      }
      acc[method].totalPaid += Number(payment.amount);
      acc[method].count++;
      return acc;
    }, {} as Record<string, any>);

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      summary: {
        totalPaid,
        paymentCount: payments.length,
        dateRange: { from: defaultDateFrom, to: defaultDateTo },
        bySupplier: Object.values(bySupplier),
        byMethod: Object.values(byMethod)
      },
      payments
    };
  }

  async getCashFlowReport(dateFrom?: Date, dateTo?: Date) {
    const defaultDateFrom = dateFrom || new Date(new Date().getFullYear(), 0, 1); // Start of year
    const defaultDateTo = dateTo || new Date();

    const payments = await prisma.$queryRaw<any[]>`
      SELECT
        DATE(p.paymentDate) as date,
        SUM(p.amount) as totalOut,
        COUNT(*) as transactionCount
      FROM Payment p
      WHERE p.deletedAt IS NULL
      AND p.paymentDate >= ${defaultDateFrom}
      AND p.paymentDate <= ${defaultDateTo}
      GROUP BY DATE(p.paymentDate)
      ORDER BY date ASC
    `;

    const totalOutflow = payments.reduce((sum, day) => sum + Number(day.totalOut), 0);

    return {
      summary: {
        dateRange: { from: defaultDateFrom, to: defaultDateTo },
        totalOutflow,
        averageDailyOutflow: payments.length > 0 ? totalOutflow / payments.length : 0
      },
      dailyFlow: payments
    };
  }

  async getFinancialSummary() {
    // Total payable (unpaid purchase orders)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        deletedAt: null,
        status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] }
      }
    });

    let totalPayable = 0;
    let totalPaid = 0;

    for (const po of purchaseOrders) {
      const payments = await prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(amount), 0) as paid
        FROM Payment
        WHERE purchaseOrderId = ${po.id}
        AND deletedAt IS NULL
      `;

      const paid = Number(payments[0]?.paid || 0);
      totalPaid += paid;
      totalPayable += Number(po.grandTotal) - paid;
    }

    // Payments in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPayments = await prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM Payment
      WHERE deletedAt IS NULL
      AND paymentDate >= ${thirtyDaysAgo}
    `;

    // Overdue amounts
    const overdue = purchaseOrders.filter(po =>
      po.expectedDeliveryDate && po.expectedDeliveryDate < new Date()
    );

    let overdueAmount = 0;
    for (const po of overdue) {
      const payments = await prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(amount), 0) as paid
        FROM Payment
        WHERE purchaseOrderId = ${po.id}
        AND deletedAt IS NULL
      `;

      const paid = Number(payments[0]?.paid || 0);
      const remaining = Number(po.grandTotal) - paid;
      if (remaining > 0) {
        overdueAmount += remaining;
      }
    }

    return {
      accountsPayable: {
        total: totalPayable,
        overdue: overdueAmount
      },
      recentActivity: {
        last30DaysPayments: Number(recentPayments[0]?.total || 0),
        last30DaysCount: Number(recentPayments[0]?.count || 0)
      },
      totalPaidToDate: totalPaid
    };
  }

  /**
   * Helper Methods
   */

  private calculatePaymentStatus(
    totalAmount: number,
    paidAmount: number,
    dueDate?: Date | null
  ): PaymentStatus {
    if (paidAmount >= totalAmount) {
      return PaymentStatus.PAID;
    }

    if (paidAmount > 0) {
      return PaymentStatus.PARTIAL;
    }

    if (dueDate && dueDate < new Date()) {
      return PaymentStatus.OVERDUE;
    }

    return PaymentStatus.PENDING;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
