import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const supplierController = new SupplierController();

// Statistics
router.get('/statistics', authMiddleware, (req, res) => supplierController.getStatistics(req, res));

// Supplier-specific actions
router.get('/:id/purchase-history', authMiddleware, (req, res) => supplierController.getPurchaseHistory(req, res));
router.get('/:id/performance', authMiddleware, (req, res) => supplierController.getPerformance(req, res));
router.put('/:id/activate', authMiddleware, requireWarehouseManager, (req, res) => supplierController.activate(req, res));
router.put('/:id/deactivate', authMiddleware, requireWarehouseManager, (req, res) => supplierController.deactivate(req, res));
router.put('/:id/rating', authMiddleware, requireWarehouseManager, (req, res) => supplierController.updateRating(req, res));

// Get by code
router.get('/code/:code', authMiddleware, (req, res) => supplierController.getByCode(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => supplierController.getAll(req, res));
router.get('/:id', authMiddleware, (req, res) => supplierController.getById(req, res));
router.post('/', authMiddleware, requireWarehouseManager, (req, res) => supplierController.create(req, res));
router.put('/:id', authMiddleware, requireWarehouseManager, (req, res) => supplierController.update(req, res));
router.delete('/:id', authMiddleware, requireWarehouseManager, (req, res) => supplierController.delete(req, res));

export default router;
