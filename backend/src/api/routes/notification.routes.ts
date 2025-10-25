import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// Statistics
router.get('/statistics', authMiddleware, (req, res) => notificationController.getStatistics(req, res));

// User-specific routes
router.get('/me', authMiddleware, (req, res) => notificationController.getUserNotifications(req, res));
router.get('/me/unread-count', authMiddleware, (req, res) => notificationController.getUnreadCount(req, res));
router.put('/me/read-all', authMiddleware, (req, res) => notificationController.markAllAsRead(req, res));
router.delete('/me/read', authMiddleware, (req, res) => notificationController.deleteAllRead(req, res));

// Individual notification actions
router.put('/:id/read', authMiddleware, (req, res) => notificationController.markAsRead(req, res));
router.put('/:id/archive', authMiddleware, (req, res) => notificationController.archive(req, res));
router.delete('/:id', authMiddleware, (req, res) => notificationController.delete(req, res));

// CRUD operations
router.get('/', authMiddleware, (req, res) => notificationController.getAll(req, res));
router.get('/:id', authMiddleware, (req, res) => notificationController.getById(req, res));

export default router;
