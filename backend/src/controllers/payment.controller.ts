import { Response, NextFunction } from 'express';
import { query, getClient } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { clearCachePattern } from '../config/redis';
import { calculateCustomerFlag } from '../utils/flagCalculator';

export async function recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { invoice_id, amount, payment_method, payment_date, notes } = req.body;

    // Enhanced validation
    if (!invoice_id || !amount || !payment_method || !payment_date) {
      throw new AppError('Missing required fields: invoice_id, amount, payment_method, and payment_date are required', 400);
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }

    if (!['cash', 'bank_transfer', 'cheque', 'card', 'online'].includes(payment_method)) {
      throw new AppError('Invalid payment method', 400);
    }

    // Validate payment date (cannot be in future)
    const paymentDateObj = new Date(payment_date);
    if (paymentDateObj > new Date()) {
      throw new AppError('Payment date cannot be in the future', 400);
    }

    // Get invoice details with row locking
    const invoiceResult = await client.query(
      'SELECT * FROM invoices WHERE id = $1 FOR UPDATE',
      [invoice_id]
    );

    if (invoiceResult.rows.length === 0) {
      throw new AppError('Invoice not found', 404);
    }

    const invoice = invoiceResult.rows[0];

    // Check if invoice is already fully paid
    if (parseFloat(invoice.remaining_balance) === 0) {
      throw new AppError('Invoice is already fully paid', 400);
    }

    // Prevent overpayment
    if (paymentAmount > parseFloat(invoice.remaining_balance)) {
      throw new AppError(
        `Payment amount (${paymentAmount}) exceeds remaining balance (${invoice.remaining_balance}). ` +
        `Please enter an amount up to ${invoice.remaining_balance}`,
        400
      );
    }

    // Record payment with unique payment number
    const payment_number = `PAY-${Date.now()}${invoice.customer_id}`;
    const paymentResult = await client.query(
      `INSERT INTO payments (payment_number, invoice_id, customer_id, amount, payment_method, payment_date, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [payment_number, invoice_id, invoice.customer_id, paymentAmount, payment_method, payment_date, notes, req.user!.id]
    );

    // Update invoice with precise calculations
    const new_paid_amount = parseFloat(invoice.paid_amount) + paymentAmount;
    const new_remaining_balance = parseFloat(invoice.total_amount) - new_paid_amount;
    
    // Ensure no floating point issues
    const final_remaining_balance = Math.max(0, Math.round(new_remaining_balance * 100) / 100);
    
    let new_status = 'pending';
    if (final_remaining_balance === 0) {
      new_status = 'paid';
    } else if (new_paid_amount > 0 && final_remaining_balance > 0) {
      if (new Date(invoice.due_date) < new Date()) {
        new_status = 'overdue';
      } else {
        new_status = 'partial';
      }
    } else if (new Date(invoice.due_date) < new Date() && final_remaining_balance > 0) {
      new_status = 'overdue';
    }

    await client.query(
      `UPDATE invoices SET paid_amount = $1, remaining_balance = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [new_paid_amount, final_remaining_balance, new_status, invoice_id]
    );

    // Update installment schedule intelligently (apply to oldest unpaid first)
    const installmentsResult = await client.query(
      `SELECT * FROM installment_schedule 
       WHERE invoice_id = $1 AND status != 'paid'
       ORDER BY installment_number ASC`,
      [invoice_id]
    );

    let remaining_payment = paymentAmount;
    for (const installment of installmentsResult.rows) {
      if (remaining_payment <= 0) break;

      const installment_remaining = parseFloat(installment.amount) - parseFloat(installment.paid_amount);
      const amount_to_apply = Math.min(remaining_payment, installment_remaining);
      const new_installment_paid = parseFloat(installment.paid_amount) + amount_to_apply;
      
      let installment_status = 'pending';
      if (new_installment_paid >= parseFloat(installment.amount)) {
        installment_status = 'paid';
      } else if (new Date(installment.due_date) < new Date()) {
        installment_status = 'overdue';
      }

      await client.query(
        `UPDATE installment_schedule 
         SET paid_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [new_installment_paid, installment_status, installment.id]
      );

      remaining_payment -= amount_to_apply;
    }

    // Recalculate customer risk flag
    await calculateCustomerFlag(client, invoice.customer_id);

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'RECORD_PAYMENT', 'payment', paymentResult.rows[0].id, JSON.stringify(paymentResult.rows[0])]
    );

    await client.query('COMMIT');
    await clearCachePattern('payments:*');
    await clearCachePattern('invoices:*');
    await clearCachePattern('customers:*');

    res.status(201).json({
      success: true,
      data: paymentResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function getPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, customer_id, invoice_id, start_date, end_date } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (customer_id) {
      whereClause += ` AND p.customer_id = $${paramIndex}`;
      params.push(customer_id);
      paramIndex++;
    }

    if (invoice_id) {
      whereClause += ` AND p.invoice_id = $${paramIndex}`;
      params.push(invoice_id);
      paramIndex++;
    }

    if (start_date) {
      whereClause += ` AND p.payment_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND p.payment_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM payments p ${whereClause}`, params);

    const result = await query(
      `SELECT p.*, c.name as customer_name, i.invoice_number
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       JOIN invoices i ON p.invoice_id = i.id
       ${whereClause}
       ORDER BY p.payment_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, c.name as customer_name, c.nic, i.invoice_number, i.total_amount
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       JOIN invoices i ON p.invoice_id = i.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Payment not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function getOverduePayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT i.*, c.name as customer_name, c.nic, c.mobile_primary, c.risk_flag,
        EXTRACT(DAY FROM (CURRENT_DATE - i.due_date)) as days_overdue
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('pending', 'partial', 'overdue') 
       AND i.due_date < CURRENT_DATE
       ORDER BY i.remaining_balance DESC, i.due_date ASC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDueTodayPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT i.*, c.name as customer_name, c.nic, c.mobile_primary
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('pending', 'partial')
       AND i.due_date = CURRENT_DATE
       ORDER BY i.remaining_balance DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoiceByNumber(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { invoice_number } = req.params;

    if (!invoice_number) {
      throw new AppError('Invoice number is required', 400);
    }

    const result = await query(
      `SELECT 
        i.*,
        c.id as customer_id,
        c.name as customer_name,
        c.nic,
        c.mobile_primary,
        c.permanent_address as address,
        c.risk_flag,
        s.sale_number,
        s.payment_type
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       LEFT JOIN sales s ON i.sale_id = s.id
       WHERE i.invoice_number = $1`,
      [invoice_number]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invoice not found', 404);
    }

    const invoice = result.rows[0];

    // Check if invoice is already fully paid
    if (parseFloat(invoice.remaining_balance) === 0) {
      return res.json({
        success: false,
        message: 'This invoice is already fully paid',
        data: invoice,
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}
