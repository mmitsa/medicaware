import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const userController = new UserController();

/**
 * @route   GET /api/v1/users/statistics
 * @desc    Get user statistics
 * @access  Private (Admin, Warehouse Manager)
 */
router.get('/statistics', authMiddleware, requireWarehouseManager, (req, res) =>
  userController.getStatistics(req, res)
);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users
 * @access  Private
 */
router.get('/search', authMiddleware, (req, res) =>
  userController.search(req, res)
);

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authMiddleware, (req, res) =>
  userController.getProfile(req, res)
);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authMiddleware, (req, res) =>
  userController.updateProfile(req, res)
);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Admin, Warehouse Manager)
 * @query   page, limit, role, status, warehouseId, search
 */
router.get('/', authMiddleware, requireWarehouseManager, (req, res) =>
  userController.getAll(req, res)
);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, requireAdmin, (req, res) =>
  userController.create(req, res)
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin, Warehouse Manager)
 */
router.get('/:id', authMiddleware, requireWarehouseManager, (req, res) =>
  userController.getById(req, res)
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, requireAdmin, (req, res) =>
  userController.update(req, res)
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, requireAdmin, (req, res) =>
  userController.delete(req, res)
);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Update user status
 * @access  Private (Admin only)
 */
router.patch('/:id/status', authMiddleware, requireAdmin, (req, res) =>
  userController.updateStatus(req, res)
);

export default router;
