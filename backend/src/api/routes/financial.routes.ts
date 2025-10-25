import { Router } from 'express';
import { FinancialController } from '../controllers/financial.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireWarehouseManager } from '../middleware/role.middleware';

const router = Router();
const financialController = new FinancialController();

// Financial Summary and Reports
router.get('/summary', authMiddleware, (req, res) => financialController.getFinancialSummary(req, res));
router.get('/reports/payments', authMiddleware, (req, res) => financialController.getPaymentReport(req, res));
router.get('/reports/cash-flow', authMiddleware, (req, res) => financialController.getCashFlowReport(req, res));

// Accounts Payable
router.get('/accounts-payable', authMiddleware, (req, res) => financialController.getAccountsPayable(req, res));
router.get('/suppliers/:supplierId/balance', authMiddleware, (req, res) => financialController.getSupplierBalance(req, res));

// Payments
router.get('/payments', authMiddleware, (req, res) => financialController.getAllPayments(req, res));
router.get('/payments/:id', authMiddleware, (req, res) => financialController.getPaymentById(req, res));
router.post('/payments', authMiddleware, requireWarehouseManager, (req, res) => financialController.createPayment(req, res));
router.delete('/payments/:id', authMiddleware, requireWarehouseManager, (req, res) => financialController.deletePayment(req, res));

// Purchase Order Payments
router.get('/purchase-orders/:purchaseOrderId/payments', authMiddleware, (req, res) => financialController.getPaymentsByPurchaseOrder(req, res));

export default router;
