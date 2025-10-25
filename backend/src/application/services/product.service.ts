import { PrismaClient, ProductCategory, ProductStatus, UnitOfMeasure } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface ProductFilters {
  category?: ProductCategory;
  status?: ProductStatus;
  search?: string;
  manufacturer?: string;
  supplier?: string;
  requiresPrescription?: boolean;
  isDangerous?: boolean;
  lowStock?: boolean;
}

export interface CreateProductData {
  code: string;
  barcode?: string;
  name: string;
  nameAr?: string;
  scientificName?: string;
  category: ProductCategory;
  status?: ProductStatus;
  description?: string;
  manufacturer?: string;
  supplier?: string;
  unitOfMeasure: UnitOfMeasure;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unitPrice?: number;
  lastPurchasePrice?: number;
  requiresPrescription?: boolean;
  isDangerous?: boolean;
  storageConditions?: string;
  imageUrl?: string;
}

export class ProductService {
  async getAll(page: number = 1, limit: number = 20, filters?: ProductFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.manufacturer) where.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' };
    if (filters?.supplier) where.supplier = { contains: filters.supplier, mode: 'insensitive' };
    if (filters?.requiresPrescription !== undefined) where.requiresPrescription = filters.requiresPrescription;
    if (filters?.isDangerous !== undefined) where.isDangerous = filters.isDangerous;

    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { nameAr: { contains: filters.search, mode: 'insensitive' } },
        { scientificName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
          _count: {
            select: { batches: true, stocks: true, stockMovements: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    // Calculate current stock for each product if lowStock filter is applied
    let filteredProducts = products;
    if (filters?.lowStock) {
      const productsWithStock = await Promise.all(
        products.map(async (product) => {
          const totalStock = await prisma.stock.aggregate({
            where: { productId: product.id, deletedAt: null },
            _sum: { quantity: true }
          });
          const currentStock = totalStock._sum.quantity || 0;
          return {
            product,
            currentStock,
            isLowStock: currentStock <= product.minStockLevel
          };
        })
      );

      filteredProducts = productsWithStock
        .filter(p => p.isLowStock)
        .map(p => p.product);
    }

    return PaginationUtil.createResponse(filteredProducts, total, page, parsedLimit);
  }

  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid product ID');

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        batches: {
          where: { deletedAt: null },
          orderBy: { expiryDate: 'asc' },
          take: 10 // Latest 10 batches
        },
        stocks: {
          where: { deletedAt: null },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            shelf: { select: { id: true, code: true, zone: { select: { code: true } } } }
          }
        },
        _count: {
          select: { batches: true, stocks: true, stockMovements: true }
        }
      }
    });

    if (!product) throw new Error('Product not found');

    // Calculate total stock across all warehouses
    const totalStock = await prisma.stock.aggregate({
      where: { productId: id, deletedAt: null },
      _sum: { quantity: true }
    });

    return {
      ...product,
      totalStock: totalStock._sum.quantity || 0
    };
  }

  async create(data: CreateProductData, createdBy: string) {
    const validation = ValidationUtil.validateRequiredFields(data, [
      'code',
      'name',
      'category',
      'unitOfMeasure'
    ]);
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    // Check if code already exists
    const codeExists = await prisma.product.findFirst({
      where: { code: data.code, deletedAt: null }
    });
    if (codeExists) throw new Error('Product code already exists');

    // Check if barcode already exists
    if (data.barcode) {
      const barcodeExists = await prisma.product.findFirst({
        where: { barcode: data.barcode, deletedAt: null }
      });
      if (barcodeExists) throw new Error('Barcode already exists');
    }

    // Validate stock levels
    if (data.minStockLevel && data.maxStockLevel && data.minStockLevel > data.maxStockLevel) {
      throw new Error('Minimum stock level cannot be greater than maximum stock level');
    }

    // Generate QR code (placeholder - actual implementation would use QR library)
    const qrCode = data.barcode ? `QR:${data.barcode}` : `QR:${data.code}`;

    const product = await prisma.product.create({
      data: {
        ...data,
        qrCode,
        createdBy
      },
      include: {
        _count: { select: { batches: true, stocks: true } }
      }
    });

    logger.info(`Product created: ${product.code} by ${createdBy}`);
    return product;
  }

  async update(id: string, data: Partial<CreateProductData>, updatedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid product ID');

    const existing = await prisma.product.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) throw new Error('Product not found');

    // Check if new code already exists
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.product.findFirst({
        where: { code: data.code, id: { not: id }, deletedAt: null }
      });
      if (codeExists) throw new Error('Product code already exists');
    }

    // Check if new barcode already exists
    if (data.barcode && data.barcode !== existing.barcode) {
      const barcodeExists = await prisma.product.findFirst({
        where: { barcode: data.barcode, id: { not: id }, deletedAt: null }
      });
      if (barcodeExists) throw new Error('Barcode already exists');
    }

    // Validate stock levels
    if (data.minStockLevel && data.maxStockLevel && data.minStockLevel > data.maxStockLevel) {
      throw new Error('Minimum stock level cannot be greater than maximum stock level');
    }

    const product = await prisma.product.update({
      where: { id },
      data: { ...data, updatedBy },
      include: {
        _count: { select: { batches: true, stocks: true } }
      }
    });

    logger.info(`Product updated: ${product.code} by ${updatedBy}`);
    return product;
  }

  async delete(id: string, deletedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid product ID');

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null }
    });
    if (!product) throw new Error('Product not found');

    // Check if product has active stock
    const activeStock = await prisma.stock.findFirst({
      where: { productId: id, quantity: { gt: 0 }, deletedAt: null }
    });
    if (activeStock) {
      throw new Error('Cannot delete product with active stock. Please transfer or dispose stock first.');
    }

    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
        status: ProductStatus.DISCONTINUED
      }
    });

    logger.info(`Product deleted: ${product.code} by ${deletedBy}`);
    return { message: 'Product deleted successfully' };
  }

  async updateStatus(id: string, status: ProductStatus, updatedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid product ID');

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null }
    });
    if (!product) throw new Error('Product not found');

    const updated = await prisma.product.update({
      where: { id },
      data: { status, updatedBy }
    });

    logger.info(`Product status updated: ${product.code} to ${status} by ${updatedBy}`);
    return updated;
  }

  async getStatistics() {
    const [total, active, byCategory, byStatus, lowStockCount] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { status: ProductStatus.ACTIVE, deletedAt: null } }),
      prisma.product.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: true
      }),
      prisma.product.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true
      }),
      this.getLowStockProducts()
    ]);

    return {
      total,
      active,
      inactive: total - active,
      lowStock: lowStockCount.length,
      byCategory: byCategory.reduce((acc: any, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc: any, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {})
    };
  }

  async search(query: string, limit: number = 10) {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { nameAr: { contains: query, mode: 'insensitive' } },
          { scientificName: { contains: query, mode: 'insensitive' } },
        ]
      },
      take: limit,
      select: {
        id: true,
        code: true,
        barcode: true,
        name: true,
        nameAr: true,
        scientificName: true,
        category: true,
        status: true,
        unitOfMeasure: true
      }
    });

    return products;
  }

  async getLowStockProducts() {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, status: ProductStatus.ACTIVE },
      select: {
        id: true,
        code: true,
        name: true,
        minStockLevel: true,
        reorderPoint: true,
        stocks: {
          where: { deletedAt: null },
          select: { quantity: true }
        }
      }
    });

    const lowStockProducts = products
      .map(product => {
        const totalStock = product.stocks.reduce((sum, stock) => sum + stock.quantity, 0);
        return {
          ...product,
          currentStock: totalStock,
          isLowStock: totalStock <= product.minStockLevel
        };
      })
      .filter(p => p.isLowStock);

    return lowStockProducts;
  }

  async getByBarcode(barcode: string) {
    const product = await prisma.product.findFirst({
      where: { barcode, deletedAt: null },
      include: {
        batches: {
          where: { deletedAt: null, isExpired: false },
          orderBy: { expiryDate: 'asc' }
        },
        stocks: {
          where: { deletedAt: null, quantity: { gt: 0 } },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            shelf: { select: { id: true, code: true } }
          }
        }
      }
    });

    if (!product) throw new Error('Product not found');

    const totalStock = await prisma.stock.aggregate({
      where: { productId: product.id, deletedAt: null },
      _sum: { quantity: true }
    });

    return {
      ...product,
      totalStock: totalStock._sum.quantity || 0
    };
  }

  async bulkCreate(products: CreateProductData[], createdBy: string) {
    const results = {
      success: [] as any[],
      failed: [] as any[]
    };

    for (const productData of products) {
      try {
        const product = await this.create(productData, createdBy);
        results.success.push({ code: productData.code, product });
      } catch (error: any) {
        results.failed.push({ code: productData.code, error: error.message });
      }
    }

    logger.info(`Bulk product creation: ${results.success.length} success, ${results.failed.length} failed by ${createdBy}`);
    return results;
  }

  async generateBarcode(productId: string) {
    if (!ValidationUtil.isValidUUID(productId)) throw new Error('Invalid product ID');

    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null }
    });
    if (!product) throw new Error('Product not found');

    if (product.barcode) {
      throw new Error('Product already has a barcode');
    }

    // Generate a unique barcode (EAN-13 format simulation)
    // In real implementation, use proper barcode generation library
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const barcode = timestamp + random;

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        barcode,
        qrCode: `QR:${barcode}`
      }
    });

    logger.info(`Barcode generated for product: ${product.code}`);
    return updated;
  }
}
