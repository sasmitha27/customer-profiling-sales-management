import { Router } from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  updateSaleStatus,
  deleteSale,
} from '../controllers/sales.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'sales_officer'), createSale);
router.get('/', getSales);
router.get('/stats', getSales); // Stats endpoint - uses query params
router.get('/:id', getSaleById);
router.patch('/:id/status', authorize('admin', 'sales_officer'), updateSaleStatus);
router.delete('/:id', authorize('admin'), deleteSale);

export default router;
