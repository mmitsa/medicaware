import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user (Admin only)
 * @access  Private (Admin)
 */
router.post('/register', authMiddleware, requireAdmin, (req, res) => authController.register(req, res));

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', authMiddleware, (req, res) => authController.changePassword(req, res));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', (req, res) => authController.requestPasswordReset(req, res));

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));

export default router;
