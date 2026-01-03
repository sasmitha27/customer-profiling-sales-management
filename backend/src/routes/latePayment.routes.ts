import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getLatePayments,
  getLatePaymentStats,
  updateLatePaymentStatus,
  escalateLatePayments
} from '../controllers/latePayment.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get late payments list
router.get('/', authorize('admin', 'manager', 'accountant', 'sales'), getLatePayments);

// Get late payment statistics
router.get('/stats', authorize('admin', 'manager', 'accountant'), getLatePaymentStats);

// Update late payment status
router.patch('/:id', authorize('admin', 'manager', 'accountant'), updateLatePaymentStatus);

// Bulk escalate late payments
router.post('/escalate', authorize('admin', 'manager'), escalateLatePayments);

export default router;
