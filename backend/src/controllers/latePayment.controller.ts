import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query, getClient } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import { clearCachePattern } from '../config/redis';

/**
 * Get all late payments with customer and invoice details
 */
export async function getLatePayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status = 'pending', customer_id } = req.query;

    let whereClause = 'WHERE lp.status = $1';
    const params: any[] = [status];
    let paramIndex = 2;

    if (customer_id) {
      whereClause += ` AND lp.customer_id = $${paramIndex}`;
      params.push(customer_id);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
        lp.*,
        c.name as customer_name,
        c.nic as customer_nic,
        c.mobile_primary as customer_mobile,
        c.risk_flag,
        i.total_amount as invoice_total,
        i.remaining_balance as invoice_remaining,
        ins.amount as installment_amount,
        ins.paid_amount as installment_paid
       FROM late_payments lp
       JOIN customers c ON lp.customer_id = c.id
       JOIN invoices i ON lp.invoice_id = i.id
       JOIN installment_schedule ins ON lp.installment_id = ins.id
       ${whereClause}
       ORDER BY lp.days_overdue DESC, lp.due_date ASC`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get late payment statistics
 */
export async function getLatePaymentStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_late_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        COALESCE(SUM(amount_due), 0) as total_amount_overdue,
        COALESCE(AVG(days_overdue), 0) as avg_days_overdue,
        COUNT(DISTINCT customer_id) as affected_customers
      FROM late_payments
      WHERE status IN ('pending', 'escalated')
    `);

    // Get top defaulters
    const defaultersResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.nic,
        c.mobile_primary,
        c.risk_flag,
        COUNT(lp.id) as late_payment_count,
        COALESCE(SUM(lp.amount_due), 0) as total_overdue_amount,
        MAX(lp.days_overdue) as max_days_overdue
      FROM customers c
      JOIN late_payments lp ON c.id = lp.customer_id
      WHERE lp.status IN ('pending', 'escalated')
      GROUP BY c.id, c.name, c.nic, c.mobile_primary, c.risk_flag
      ORDER BY total_overdue_amount DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        stats: statsResult.rows[0],
        topDefaulters: defaultersResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update late payment status
 */
export async function updateLatePaymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'resolved', 'escalated'].includes(status)) {
      throw new AppError('Invalid status. Must be: pending, resolved, or escalated', 400);
    }

    await client.query('BEGIN');

    const resolved_at = status === 'resolved' ? new Date() : null;

    const result = await client.query(
      `UPDATE late_payments 
       SET status = $1, notes = $2, resolved_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, notes || null, resolved_at, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Late payment record not found', 404);
    }

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'UPDATE_LATE_PAYMENT', 'late_payment', id, JSON.stringify(result.rows[0])]
    );

    await client.query('COMMIT');
    await clearCachePattern('late_payments:*');

    res.json({
      success: true,
      data: result.rows[0],
      message: `Late payment status updated to ${status}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

/**
 * Bulk escalate late payments
 */
export async function escalateLatePayments(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();
  
  try {
    const { days_threshold = 30 } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE late_payments 
       SET status = 'escalated', notes = CONCAT(COALESCE(notes, ''), ' [Auto-escalated: ' || $1 || '+ days overdue]'), updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending' AND days_overdue >= $1
       RETURNING *`,
      [days_threshold]
    );

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'BULK_ESCALATE', 'late_payment', 0, JSON.stringify({ count: result.rows.length, threshold: days_threshold })]
    );

    await client.query('COMMIT');
    await clearCachePattern('late_payments:*');

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      message: `Escalated ${result.rows.length} late payment(s)`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}
