import { PrismaClient, WarehouseType } from '@prisma/client';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { PaginationUtil } from '../../shared/utils/pagination.util';
import logger from '../../shared/utils/logger';

const prisma = new PrismaClient();

export interface WarehouseFilters {
  type?: WarehouseType;
  city?: string;
  region?: string;
  isActive?: boolean;
  search?: string;
}

export interface CreateWarehouseData {
  code: string;
  name: string;
  nameAr?: string;
  type: WarehouseType;
  description?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  manager?: string;
  capacity?: number;
  isActive?: boolean;
}

export class WarehouseService {
  async getAll(page: number = 1, limit: number = 20, filters?: WarehouseFilters) {
    const { skip, limit: parsedLimit } = PaginationUtil.getParams(page, limit);

    const where: any = { deletedAt: null };

    if (filters?.type) where.type = filters.type;
    if (filters?.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters?.region) where.region = { contains: filters.region, mode: 'insensitive' };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { nameAr: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
          _count: {
            select: { zones: true, users: true, stocks: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.warehouse.count({ where })
    ]);

    return PaginationUtil.createResponse(warehouses, total, page, parsedLimit);
  }

  async getById(id: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid warehouse ID');

    const warehouse = await prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      include: {
        zones: {
          where: { deletedAt: null },
          include: {
            shelves: { where: { deletedAt: null }, orderBy: { code: 'asc' } },
            _count: { select: { shelves: true, stocks: true } }
          },
          orderBy: { code: 'asc' }
        },
        _count: { select: { users: true, stocks: true, transferOrdersFrom: true, transferOrdersTo: true } }
      }
    });

    if (!warehouse) throw new Error('Warehouse not found');
    return warehouse;
  }

  async create(data: CreateWarehouseData, createdBy: string) {
    const validation = ValidationUtil.validateRequiredFields(data, ['code', 'name', 'type']);
    if (!validation.valid) throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);

    const existing = await prisma.warehouse.findFirst({ where: { code: data.code, deletedAt: null } });
    if (existing) throw new Error('Warehouse code already exists');

    if (data.email && !ValidationUtil.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    const warehouse = await prisma.warehouse.create({
      data: { ...data, createdBy },
      include: { _count: { select: { zones: true, users: true } } }
    });

    logger.info(`Warehouse created: ${warehouse.code} by ${createdBy}`);
    return warehouse;
  }

  async update(id: string, data: Partial<CreateWarehouseData>, updatedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid warehouse ID');

    const existing = await prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error('Warehouse not found');

    if (data.code) {
      const codeExists = await prisma.warehouse.findFirst({
        where: { code: data.code, id: { not: id }, deletedAt: null }
      });
      if (codeExists) throw new Error('Warehouse code already exists');
    }

    if (data.email && !ValidationUtil.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { ...data, updatedBy },
      include: { _count: { select: { zones: true, users: true } } }
    });

    logger.info(`Warehouse updated: ${warehouse.code} by ${updatedBy}`);
    return warehouse;
  }

  async delete(id: string, deletedBy: string) {
    if (!ValidationUtil.isValidUUID(id)) throw new Error('Invalid warehouse ID');

    const warehouse = await prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
    if (!warehouse) throw new Error('Warehouse not found');

    await prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy, isActive: false }
    });

    logger.info(`Warehouse deleted: ${warehouse.code} by ${deletedBy}`);
    return { message: 'Warehouse deleted successfully' };
  }

  // Zone Management
  async createZone(warehouseId: string, data: any, createdBy: string) {
    if (!ValidationUtil.isValidUUID(warehouseId)) throw new Error('Invalid warehouse ID');

    const warehouse = await prisma.warehouse.findFirst({ where: { id: warehouseId, deletedAt: null } });
    if (!warehouse) throw new Error('Warehouse not found');

    const existing = await prisma.zone.findFirst({
      where: { warehouseId, code: data.code, deletedAt: null }
    });
    if (existing) throw new Error('Zone code already exists in this warehouse');

    const zone = await prisma.zone.create({
      data: { ...data, warehouseId },
      include: { _count: { select: { shelves: true } } }
    });

    logger.info(`Zone created: ${zone.code} in ${warehouse.code}`);
    return zone;
  }

  async createShelf(zoneId: string, data: any) {
    if (!ValidationUtil.isValidUUID(zoneId)) throw new Error('Invalid zone ID');

    const zone = await prisma.zone.findFirst({ where: { id: zoneId, deletedAt: null } });
    if (!zone) throw new Error('Zone not found');

    const existing = await prisma.shelf.findFirst({
      where: { zoneId, code: data.code, deletedAt: null }
    });
    if (existing) throw new Error('Shelf code already exists in this zone');

    const shelf = await prisma.shelf.create({ data: { ...data, zoneId } });
    logger.info(`Shelf created: ${shelf.code} in zone ${zone.code}`);
    return shelf;
  }

  async getStatistics() {
    const [total, active, byType] = await Promise.all([
      prisma.warehouse.count({ where: { deletedAt: null } }),
      prisma.warehouse.count({ where: { isActive: true, deletedAt: null } }),
      prisma.warehouse.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: true
      })
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byType: byType.reduce((acc: any, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {})
    };
  }
}
