import { Router } from 'express';
import {
  generateSalesReport,
  generatePaymentReport,
  generateCustomerReport,
  generateOverdueReport,
} from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/sales', generateSalesReport);
router.get('/payments', generatePaymentReport);
router.get('/customers', generateCustomerReport);
router.get('/overdue', generateOverdueReport);

export default router;
