import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerWithDetails,
  updateCustomerFlag,
  addGuarantor,
  getCustomerGuarantors,
  getCustomersForGuarantor,
  removeGuarantor,
  validateCustomerUniqueness,
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Customer CRUD
router.post('/', authorize('admin', 'sales_officer'), createCustomer);
router.get('/', getCustomers);
router.get('/stats', getCustomers); // Stats endpoint - uses query params
router.get('/:id/details', getCustomerWithDetails);
router.get('/:id', getCustomerById);
router.put('/:id', authorize('admin', 'sales_officer'), updateCustomer);
router.patch('/:id/flag', authorize('admin'), updateCustomerFlag);
router.delete('/:id', authorize('admin'), deleteCustomer);

// Guarantor management
router.post('/:id/guarantors', authorize('admin', 'sales_officer'), addGuarantor);
router.get('/:id/guarantors', getCustomerGuarantors);
router.get('/:id/as-guarantor', getCustomersForGuarantor);
router.delete('/:id/guarantors/:guarantorId', authorize('admin', 'sales_officer'), removeGuarantor);

// Validation
router.post('/validate/uniqueness', validateCustomerUniqueness);

export default router;
