import { Router } from 'express';
import { StockCountController } from '../controllers/stock-count.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const stockCountController = new StockCountController();

// Statistics & Reports (Manager+)
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.getStatistics(req, res));
router.get('/:id/variance', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.getVarianceReport(req, res));

// Workflow actions (Manager+)
router.post('/:id/start', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.start(req, res));
router.post('/:id/record', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.recordCounts(req, res));
router.post('/:id/complete', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.complete(req, res));
router.post('/:id/approve', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.approve(req, res));
router.post('/:id/cancel', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.cancel(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => stockCountController.getAll(req, res));
router.post('/', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.create(req, res));
router.get('/:id', authMiddleware, (req, res) => stockCountController.getById(req, res));
router.put('/:id', authMiddleware, requireWarehouseManager, (req, res) => stockCountController.update(req, res));

export default router;
