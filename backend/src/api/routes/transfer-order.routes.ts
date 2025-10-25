import { Router } from 'express';
import { TransferOrderController } from '../controllers/transfer-order.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const transferOrderController = new TransferOrderController();

// Statistics (Manager+)
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.getStatistics(req, res));

// Workflow actions (Manager+)
router.post('/:id/submit', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.submit(req, res));
router.post('/:id/approve', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.approve(req, res));
router.post('/:id/reject', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.reject(req, res));
router.post('/:id/ship', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.ship(req, res));
router.post('/:id/receive', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.receive(req, res));
router.post('/:id/cancel', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.cancel(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => transferOrderController.getAll(req, res));
router.post('/', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.create(req, res));
router.get('/:id', authMiddleware, (req, res) => transferOrderController.getById(req, res));
router.put('/:id', authMiddleware, requireWarehouseManager, (req, res) => transferOrderController.update(req, res));

export default router;
