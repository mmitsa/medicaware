import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const batchController = new BatchController();

// Statistics & Reports (Manager+)
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => batchController.getStatistics(req, res));
router.get('/expiring', authMiddleware, requireWarehouseManager, (req, res) => batchController.getExpiringBatches(req, res));
router.get('/expired', authMiddleware, requireWarehouseManager, (req, res) => batchController.getExpiredBatches(req, res));

// Batch operations
router.post('/mark-expired', authMiddleware, requireWarehouseManager, (req, res) => batchController.markAsExpired(req, res));
router.post('/:id/recall', authMiddleware, requireAdmin, (req, res) => batchController.recall(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => batchController.getAll(req, res));
router.post('/', authMiddleware, requireWarehouseManager, (req, res) => batchController.create(req, res));
router.get('/:id', authMiddleware, (req, res) => batchController.getById(req, res));
router.put('/:id', authMiddleware, requireWarehouseManager, (req, res) => batchController.update(req, res));
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => batchController.delete(req, res));

export default router;
