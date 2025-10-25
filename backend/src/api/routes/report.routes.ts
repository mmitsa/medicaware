import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const reportController = new ReportController();

// Dashboard
router.get('/dashboard', authMiddleware, (req, res) => reportController.getDashboardSummary(req, res));

// Stock Reports
router.get('/stock/levels', authMiddleware, (req, res) => reportController.getStockLevelsReport(req, res));
router.get('/stock/low-stock', authMiddleware, (req, res) => reportController.getLowStockReport(req, res));
router.get('/stock/expiry', authMiddleware, (req, res) => reportController.getExpiryReport(req, res));
router.get('/stock/valuation', authMiddleware, (req, res) => reportController.getStockValuationReport(req, res));

// Movement Reports
router.get('/movements', authMiddleware, (req, res) => reportController.getStockMovementReport(req, res));

// Transfer Order Reports
router.get('/transfers', authMiddleware, (req, res) => reportController.getTransferOrderReport(req, res));

// Purchase Order Reports
router.get('/purchases', authMiddleware, (req, res) => reportController.getPurchaseOrderReport(req, res));

// Product Analytics
router.get('/analytics/products', authMiddleware, (req, res) => reportController.getProductAnalytics(req, res));

export default router;
