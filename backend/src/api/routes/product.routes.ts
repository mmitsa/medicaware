import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const productController = new ProductController();

// Statistics & Reports (Manager+)
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => productController.getStatistics(req, res));
router.get('/low-stock', authMiddleware, requireWarehouseManager, (req, res) => productController.getLowStock(req, res));

// Search (All authenticated users)
router.get('/search', authMiddleware, (req, res) => productController.search(req, res));

// Barcode operations
router.get('/barcode/:barcode', authMiddleware, (req, res) => productController.getByBarcode(req, res));
router.post('/:id/generate-barcode', authMiddleware, requireAdmin, (req, res) => productController.generateBarcode(req, res));

// Bulk operations (Admin only)
router.post('/bulk', authMiddleware, requireAdmin, (req, res) => productController.bulkCreate(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => productController.getAll(req, res));
router.post('/', authMiddleware, requireAdmin, (req, res) => productController.create(req, res));
router.get('/:id', authMiddleware, (req, res) => productController.getById(req, res));
router.put('/:id', authMiddleware, requireAdmin, (req, res) => productController.update(req, res));
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => productController.delete(req, res));
router.patch('/:id/status', authMiddleware, requireAdmin, (req, res) => productController.updateStatus(req, res));

export default router;
