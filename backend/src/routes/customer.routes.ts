import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerWithDetails,
  updateCustomerFlag,
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'sales_officer'), createCustomer);
router.get('/', getCustomers);
router.get('/stats', getCustomers); // Stats endpoint - uses query params
router.get('/:id/details', getCustomerWithDetails);
router.get('/:id', getCustomerById);
router.put('/:id', authorize('admin', 'sales_officer'), updateCustomer);
router.patch('/:id/flag', authorize('admin'), updateCustomerFlag);
router.delete('/:id', authorize('admin'), deleteCustomer);

export default router;
