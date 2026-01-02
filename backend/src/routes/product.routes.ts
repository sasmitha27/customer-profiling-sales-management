import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'sales_officer'), createProduct);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.put('/:id', authorize('admin', 'sales_officer'), updateProduct);
router.delete('/:id', authorize('admin'), deleteProduct);

export default router;
