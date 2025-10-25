import { prisma } from '../../index';
import { Prisma } from '@prisma/client';

export class SupplierService {
  async getAll(page: number = 1, limit: number = 20, filters?: {
    search?: string;
    isActive?: boolean;
    rating?: number;
  }) {
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.rating && { rating: { gte: filters.rating } }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { nameAr: { contains: filters.search } },
          { contactPerson: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } }
        ]
      })
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { purchaseOrders: true }
          }
        }
      }),
      prisma.supplier.count({ where })
    ]);

    return {
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        _count: {
          select: { purchaseOrders: true }
        }
      }
    });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplier;
  }

  async getByCode(code: string) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        code,
        deletedAt: null
      }
    });

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    return supplier;
  }

  async create(data: {
    code: string;
    name: string;
    nameAr?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    fax?: string;
    website?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    taxId?: string;
    commercialRegistration?: string;
    paymentTerms?: string;
    creditLimit?: number;
    rating?: number;
    notes?: string;
    isActive?: boolean;
  }, createdById: string) {
    // Check if code already exists
    const existing = await prisma.supplier.findFirst({
      where: {
        code: data.code,
        deletedAt: null
      }
    });

    if (existing) {
      throw new Error('Supplier code already exists');
    }

    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate rating if provided
    if (data.rating !== undefined && (data.rating < 0 || data.rating > 5)) {
      throw new Error('Rating must be between 0 and 5');
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        rating: data.rating || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdById
      },
      include: {
        _count: {
          select: { purchaseOrders: true }
        }
      }
    });

    return supplier;
  }

  async update(id: string, data: {
    code?: string;
    name?: string;
    nameAr?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    fax?: string;
    website?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    taxId?: string;
    commercialRegistration?: string;
    paymentTerms?: string;
    creditLimit?: number;
    rating?: number;
    notes?: string;
    isActive?: boolean;
  }, updatedById: string) {
    const supplier = await this.getById(id);

    // Check if code is being changed and if new code already exists
    if (data.code && data.code !== supplier.code) {
      const existing = await prisma.supplier.findFirst({
        where: {
          code: data.code,
          deletedAt: null,
          id: { not: id }
        }
      });

      if (existing) {
        throw new Error('Supplier code already exists');
      }
    }

    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate rating if provided
    if (data.rating !== undefined && (data.rating < 0 || data.rating > 5)) {
      throw new Error('Rating must be between 0 and 5');
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...data,
        updatedById,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { purchaseOrders: true }
        }
      }
    });

    return updated;
  }

  async delete(id: string, deletedById: string) {
    const supplier = await this.getById(id);

    // Check if supplier has active purchase orders
    const activePurchaseOrders = await prisma.purchaseOrder.count({
      where: {
        supplierId: id,
        deletedAt: null,
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED'] }
      }
    });

    if (activePurchaseOrders > 0) {
      throw new Error('Cannot delete supplier with active purchase orders');
    }

    await prisma.supplier.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: deletedById,
        updatedAt: new Date()
      }
    });

    return { message: 'Supplier deleted successfully' };
  }

  async activate(id: string, userId: string) {
    await this.getById(id);

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: userId,
        updatedAt: new Date()
      }
    });

    return supplier;
  }

  async deactivate(id: string, userId: string) {
    await this.getById(id);

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: userId,
        updatedAt: new Date()
      }
    });

    return supplier;
  }

  async updateRating(id: string, rating: number, userId: string) {
    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    await this.getById(id);

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        rating,
        updatedById: userId,
        updatedAt: new Date()
      }
    });

    return supplier;
  }

  async getSupplierPurchaseHistory(id: string, dateFrom?: Date, dateTo?: Date) {
    await this.getById(id);

    const where: Prisma.PurchaseOrderWhereInput = {
      supplierId: id,
      deletedAt: null,
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
      ...(dateTo && { createdAt: { lte: dateTo } })
    };

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const summary = {
      totalOrders: purchaseOrders.length,
      totalSpent: purchaseOrders.reduce((sum, po) => sum + Number(po.grandTotal), 0),
      ordersByStatus: purchaseOrders.reduce((acc, po) => {
        acc[po.status] = (acc[po.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageOrderValue: purchaseOrders.length > 0
        ? purchaseOrders.reduce((sum, po) => sum + Number(po.grandTotal), 0) / purchaseOrders.length
        : 0
    };

    return {
      summary,
      purchaseOrders
    };
  }

  async getSupplierPerformance(id: string) {
    await this.getById(id);

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId: id,
        deletedAt: null
      }
    });

    const totalOrders = purchaseOrders.length;
    const completedOrders = purchaseOrders.filter(po => po.status === 'RECEIVED').length;
    const cancelledOrders = purchaseOrders.filter(po => po.status === 'CANCELLED').length;

    // Calculate on-time delivery rate
    const ordersWithDelivery = purchaseOrders.filter(
      po => po.receivedDate && po.expectedDeliveryDate
    );

    const onTimeDeliveries = ordersWithDelivery.filter(
      po => po.receivedDate! <= po.expectedDeliveryDate!
    ).length;

    const onTimeDeliveryRate = ordersWithDelivery.length > 0
      ? (onTimeDeliveries / ordersWithDelivery.length) * 100
      : 0;

    // Calculate average delivery time
    const deliveryTimes = ordersWithDelivery.map(po => {
      const ordered = po.orderDate || po.createdAt;
      const received = po.receivedDate!;
      return Math.ceil((received.getTime() - ordered.getTime()) / (1000 * 60 * 60 * 24));
    });

    const averageDeliveryDays = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, days) => sum + days, 0) / deliveryTimes.length
      : 0;

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      onTimeDeliveryRate,
      averageDeliveryDays,
      totalSpent: purchaseOrders.reduce((sum, po) => sum + Number(po.grandTotal), 0)
    };
  }

  async getStatistics() {
    const [total, active, inactive] = await Promise.all([
      prisma.supplier.count({ where: { deletedAt: null } }),
      prisma.supplier.count({ where: { deletedAt: null, isActive: true } }),
      prisma.supplier.count({ where: { deletedAt: null, isActive: false } })
    ]);

    // Top suppliers by purchase volume
    const suppliers = await prisma.supplier.findMany({
      where: { deletedAt: null },
      include: {
        purchaseOrders: {
          where: { deletedAt: null }
        }
      }
    });

    const suppliersWithTotals = suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      totalOrders: supplier.purchaseOrders.length,
      totalSpent: supplier.purchaseOrders.reduce((sum, po) => sum + Number(po.grandTotal), 0),
      rating: supplier.rating
    })).sort((a, b) => b.totalSpent - a.totalSpent);

    const topSuppliers = suppliersWithTotals.slice(0, 10);

    return {
      total,
      active,
      inactive,
      topSuppliers
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
