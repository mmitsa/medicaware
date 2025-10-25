import { Router } from 'express';
import { StockMovementController } from '../controllers/stock-movement.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const stockMovementController = new StockMovementController();

// Statistics & Reports (Manager+)
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => stockMovementController.getStatistics(req, res));
router.get('/report', authMiddleware, requireWarehouseManager, (req, res) => stockMovementController.getReport(req, res));

// Create movements (Manager+)
router.post('/receipt', authMiddleware, requireWarehouseManager, (req, res) => stockMovementController.createReceipt(req, res));
router.post('/issue', authMiddleware, requireWarehouseManager, (req, res) => stockMovementController.createIssue(req, res));
router.post('/return', authMiddleware, requireWarehouseManager, (req, res) => stockMovementController.createReturn(req, res));
router.post('/expired', authMiddleware, requireWarehouseManager, (req, res) => stockMovementController.createExpired(req, res));
router.post('/damaged', authMiddleware, requireWarehouseManager, (req, res) => stockMovementController.createDamaged(req, res));

// Query movements (All authenticated users)
router.get('/', authMiddleware, (req, res) => stockMovementController.getAll(req, res));
router.get('/product/:productId', authMiddleware, (req, res) => stockMovementController.getByProduct(req, res));
router.get('/warehouse/:warehouseId', authMiddleware, (req, res) => stockMovementController.getByWarehouse(req, res));
router.get('/:id', authMiddleware, (req, res) => stockMovementController.getById(req, res));

export default router;
