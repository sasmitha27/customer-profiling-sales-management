import { Router } from 'express';
import {
  recordPayment,
  getPayments,
  getPaymentById,
  getOverduePayments,
  getDueTodayPayments,
  getInvoiceByNumber,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'sales_officer', 'accountant'), recordPayment);
router.get('/', getPayments);
router.get('/stats', getPayments); // Stats endpoint - uses query params
router.get('/overdue', getOverduePayments);
router.get('/due-today', getDueTodayPayments);
router.get('/invoice/:invoice_number', getInvoiceByNumber);
router.get('/:id', getPaymentById);

export default router;
