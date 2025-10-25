import { prisma } from '../../index';
import { Prisma } from '@prisma/client';

export class CategoryService {
  async getAll(page: number = 1, limit: number = 20, filters?: {
    search?: string;
    isActive?: boolean;
    parentId?: string;
  }) {
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.parentId !== undefined && {
        parentId: filters.parentId === 'null' ? null : filters.parentId
      }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { nameAr: { contains: filters.search } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ]
      })
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          parent: true,
          subcategories: {
            where: { deletedAt: null }
          },
          _count: {
            select: {
              products: true,
              subcategories: true
            }
          }
        }
      }),
      prisma.category.count({ where })
    ]);

    return {
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id: string) {
    const category = await prisma.category.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        parent: true,
        subcategories: {
          where: { deletedAt: null }
        },
        _count: {
          select: {
            products: true,
            subcategories: true
          }
        }
      }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async getByCode(code: string) {
    const category = await prisma.category.findFirst({
      where: {
        code,
        deletedAt: null
      },
      include: {
        parent: true,
        subcategories: {
          where: { deletedAt: null }
        }
      }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async getTree() {
    // Get all root categories (no parent)
    const rootCategories = await prisma.category.findMany({
      where: {
        deletedAt: null,
        parentId: null
      },
      include: {
        subcategories: {
          where: { deletedAt: null },
          include: {
            subcategories: {
              where: { deletedAt: null },
              include: {
                _count: {
                  select: { products: true }
                }
              }
            },
            _count: {
              select: { products: true }
            }
          }
        },
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return rootCategories;
  }

  async create(data: {
    code: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    parentId?: string;
    isActive?: boolean;
  }, createdById: string) {
    // Check if code already exists
    const existing = await prisma.category.findFirst({
      where: {
        code: data.code,
        deletedAt: null
      }
    });

    if (existing) {
      throw new Error('Category code already exists');
    }

    // If parentId is provided, verify parent exists
    if (data.parentId) {
      const parent = await prisma.category.findFirst({
        where: {
          id: data.parentId,
          deletedAt: null
        }
      });

      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdById
      },
      include: {
        parent: true,
        _count: {
          select: {
            products: true,
            subcategories: true
          }
        }
      }
    });

    return category;
  }

  async update(id: string, data: {
    code?: string;
    name?: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    parentId?: string;
    isActive?: boolean;
  }, updatedById: string) {
    const category = await this.getById(id);

    // Check if code is being changed and if new code already exists
    if (data.code && data.code !== category.code) {
      const existing = await prisma.category.findFirst({
        where: {
          code: data.code,
          deletedAt: null,
          id: { not: id }
        }
      });

      if (existing) {
        throw new Error('Category code already exists');
      }
    }

    // If parentId is being changed, verify it's not creating a circular reference
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new Error('Category cannot be its own parent');
      }

      if (data.parentId) {
        // Check if new parent is a descendant of this category
        const isDescendant = await this.isDescendant(id, data.parentId);
        if (isDescendant) {
          throw new Error('Cannot set parent to a descendant category (circular reference)');
        }

        const parent = await prisma.category.findFirst({
          where: {
            id: data.parentId,
            deletedAt: null
          }
        });

        if (!parent) {
          throw new Error('Parent category not found');
        }
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...data,
        updatedById,
        updatedAt: new Date()
      },
      include: {
        parent: true,
        _count: {
          select: {
            products: true,
            subcategories: true
          }
        }
      }
    });

    return updated;
  }

  async delete(id: string, deletedById: string) {
    const category = await this.getById(id);

    // Check if category has products
    const productCount = await prisma.product.count({
      where: {
        categoryId: id,
        deletedAt: null
      }
    });

    if (productCount > 0) {
      throw new Error('Cannot delete category with associated products');
    }

    // Check if category has subcategories
    const subcategoryCount = await prisma.category.count({
      where: {
        parentId: id,
        deletedAt: null
      }
    });

    if (subcategoryCount > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    await prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: deletedById,
        updatedAt: new Date()
      }
    });

    return { message: 'Category deleted successfully' };
  }

  async activate(id: string, userId: string) {
    await this.getById(id);

    const category = await prisma.category.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: userId,
        updatedAt: new Date()
      }
    });

    return category;
  }

  async deactivate(id: string, userId: string) {
    await this.getById(id);

    const category = await prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: userId,
        updatedAt: new Date()
      }
    });

    return category;
  }

  async getCategoryProducts(id: string, page: number = 1, limit: number = 20) {
    await this.getById(id);

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          categoryId: id,
          deletedAt: null
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.product.count({
        where: {
          categoryId: id,
          deletedAt: null
        }
      })
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getStatistics() {
    const [total, active, inactive, rootCategories] = await Promise.all([
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.category.count({ where: { deletedAt: null, isActive: true } }),
      prisma.category.count({ where: { deletedAt: null, isActive: false } }),
      prisma.category.count({ where: { deletedAt: null, parentId: null } })
    ]);

    // Get categories with most products
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        products: {
          _count: 'desc'
        }
      },
      take: 10
    });

    const topCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      nameAr: cat.nameAr,
      productCount: cat._count.products
    }));

    return {
      total,
      active,
      inactive,
      rootCategories,
      topCategories
    };
  }

  /**
   * Helper method to check if potentialDescendant is a descendant of categoryId
   */
  private async isDescendant(categoryId: string, potentialDescendantId: string): Promise<boolean> {
    const potentialDescendant = await prisma.category.findUnique({
      where: { id: potentialDescendantId },
      include: {
        subcategories: {
          where: { deletedAt: null }
        }
      }
    });

    if (!potentialDescendant) return false;

    // Check direct descendants
    const directDescendants = potentialDescendant.subcategories;
    if (directDescendants.some(cat => cat.id === categoryId)) {
      return true;
    }

    // Check descendants of descendants (recursive)
    for (const descendant of directDescendants) {
      const isIndirectDescendant = await this.isDescendant(categoryId, descendant.id);
      if (isIndirectDescendant) {
        return true;
      }
    }

    return false;
  }
}
