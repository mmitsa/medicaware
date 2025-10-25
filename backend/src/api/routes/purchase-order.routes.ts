import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const purchaseOrderController = new PurchaseOrderController();

// Statistics (Manager+)
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.getStatistics(req, res));

// Workflow actions (Manager+)
router.post('/:id/submit', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.submit(req, res));
router.post('/:id/approve', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.approve(req, res));
router.post('/:id/order', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.placeOrder(req, res));
router.post('/:id/receive', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.receive(req, res));
router.post('/:id/cancel', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.cancel(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => purchaseOrderController.getAll(req, res));
router.post('/', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.create(req, res));
router.get('/:id', authMiddleware, (req, res) => purchaseOrderController.getById(req, res));
router.put('/:id', authMiddleware, requireWarehouseManager, (req, res) => purchaseOrderController.update(req, res));

export default router;
