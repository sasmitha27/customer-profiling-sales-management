import { Router } from 'express';
import {
  getSalesDashboard,
  getPaymentDashboard,
  getProductDashboard,
  getCustomerDashboard,
  getLatePaymentsDashboard,
} from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/sales', getSalesDashboard);
router.get('/sales-summary', getSalesDashboard);
router.get('/payments', getPaymentDashboard);
router.get('/payment-summary', getPaymentDashboard);
router.get('/products', getProductDashboard);
router.get('/product-performance', getProductDashboard);
router.get('/customers', getCustomerDashboard);
router.get('/customer-summary', getCustomerDashboard);
router.get('/late-payments', getLatePaymentsDashboard);
router.get('/high-value-customers', getCustomerDashboard);

export default router;
