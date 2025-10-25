import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const categoryController = new CategoryController();

// Statistics
router.get('/statistics', authMiddleware, (req, res) => categoryController.getStatistics(req, res));

// Tree view
router.get('/tree', authMiddleware, (req, res) => categoryController.getTree(req, res));

// Category-specific actions
router.get('/:id/products', authMiddleware, (req, res) => categoryController.getProducts(req, res));
router.put('/:id/activate', authMiddleware, requireWarehouseManager, (req, res) => categoryController.activate(req, res));
router.put('/:id/deactivate', authMiddleware, requireWarehouseManager, (req, res) => categoryController.deactivate(req, res));

// Get by code
router.get('/code/:code', authMiddleware, (req, res) => categoryController.getByCode(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => categoryController.getAll(req, res));
router.get('/:id', authMiddleware, (req, res) => categoryController.getById(req, res));
router.post('/', authMiddleware, requireWarehouseManager, (req, res) => categoryController.create(req, res));
router.put('/:id', authMiddleware, requireWarehouseManager, (req, res) => categoryController.update(req, res));
router.delete('/:id', authMiddleware, requireWarehouseManager, (req, res) => categoryController.delete(req, res));

export default router;
