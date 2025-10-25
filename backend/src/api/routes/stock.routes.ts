import { Router } from 'express';
import { StockController } from '../controllers/stock.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const stockController = new StockController();

// Statistics & Reports (Manager+)
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => stockController.getStatistics(req, res));
router.get('/low-stock', authMiddleware, requireWarehouseManager, (req, res) => stockController.getLowStock(req, res));
router.get('/out-of-stock', authMiddleware, requireWarehouseManager, (req, res) => stockController.getOutOfStock(req, res));

// Stock operations (Manager+)
router.post('/adjust', authMiddleware, requireWarehouseManager, (req, res) => stockController.adjustStock(req, res));
router.post('/reserve', authMiddleware, requireWarehouseManager, (req, res) => stockController.reserveStock(req, res));
router.post('/release', authMiddleware, requireWarehouseManager, (req, res) => stockController.releaseReservedStock(req, res));

// Query operations (All authenticated users)
router.get('/', authMiddleware, (req, res) => stockController.getAll(req, res));
router.get('/product/:productId', authMiddleware, (req, res) => stockController.getByProduct(req, res));
router.get('/warehouse/:warehouseId', authMiddleware, (req, res) => stockController.getByWarehouse(req, res));
router.get('/:id', authMiddleware, (req, res) => stockController.getById(req, res));

export default router;
