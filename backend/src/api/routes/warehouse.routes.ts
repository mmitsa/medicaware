import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const warehouseController = new WarehouseController();

router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) => warehouseController.getStatistics(req, res));
router.get('/', authMiddleware, (req, res) => warehouseController.getAll(req, res));
router.post('/', authMiddleware, requireAdmin, (req, res) => warehouseController.create(req, res));
router.get('/:id', authMiddleware, (req, res) => warehouseController.getById(req, res));
router.put('/:id', authMiddleware, requireAdmin, (req, res) => warehouseController.update(req, res));
router.delete('/:id', authMiddleware, requireAdmin, (req, res) => warehouseController.delete(req, res));
router.post('/:id/zones', authMiddleware, requireAdmin, (req, res) => warehouseController.createZone(req, res));
router.post('/zones/:zoneId/shelves', authMiddleware, requireAdmin, (req, res) => warehouseController.createShelf(req, res));

export default router;
