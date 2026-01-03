import { PoolClient } from 'pg';

/**
 * Calculate and update customer risk flag based on payment history
 * Risk factors:
 * - Payment history (overdue ratio)
 * - Days overdue (max and average)
 * - Outstanding balance
 * - Payment consistency
 * - Credit limit vs outstanding
 */
export async function calculateCustomerFlag(client: PoolClient, customer_id: number): Promise<void> {
  try {
    // Check if flag is manually overridden
    const customerResult = await client.query(
      'SELECT flag_override, risk_flag FROM customers WHERE id = $1',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return; // Customer not found
    }

    if (customerResult.rows[0]?.flag_override) {
      return; // Don't auto-calculate if manually overridden by admin
    }

    // Get comprehensive payment statistics
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_count,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN i.status = 'partial' THEN 1 END) as partial_count,
        COALESCE(SUM(CASE WHEN i.status IN ('pending', 'partial', 'overdue') THEN i.remaining_balance ELSE 0 END), 0) as total_outstanding,
        COALESCE(MAX(CASE WHEN i.status = 'overdue' THEN (CURRENT_DATE - i.due_date) ELSE 0 END), 0) as max_days_overdue,
        COALESCE(AVG(CASE WHEN i.status = 'overdue' THEN (CURRENT_DATE - i.due_date) ELSE NULL END), 0) as avg_days_overdue,
        COALESCE(SUM(i.total_amount), 0) as total_credit_given,
        COALESCE(SUM(i.paid_amount), 0) as total_paid
       FROM invoices i
       LEFT JOIN sales s ON i.sale_id = s.id
       WHERE i.customer_id = $1 AND COALESCE(s.sale_date, i.created_at) >= CURRENT_DATE - INTERVAL '12 months'`,
      [customer_id]
    );

    const stats = statsResult.rows[0];
    const total_invoices = parseInt(stats.total_invoices);
    const overdue_count = parseInt(stats.overdue_count);
    const paid_count = parseInt(stats.paid_count);
    const partial_count = parseInt(stats.partial_count);
    const total_outstanding = parseFloat(stats.total_outstanding || 0);
    const max_days_overdue = parseFloat(stats.max_days_overdue || 0);
    const avg_days_overdue = parseFloat(stats.avg_days_overdue || 0);
    const total_credit_given = parseFloat(stats.total_credit_given || 0);
    const total_paid = parseFloat(stats.total_paid || 0);

    // Calculate risk score (0-100)
    let risk_score = 0;

    if (total_invoices > 0) {
      // Factor 1: Overdue ratio (0-30 points)
      const overdue_ratio = overdue_count / total_invoices;
      risk_score += overdue_ratio * 30;

      // Factor 2: Days overdue severity (0-25 points)
      if (max_days_overdue > 90) {
        risk_score += 25;
      } else if (max_days_overdue > 60) {
        risk_score += 20;
      } else if (max_days_overdue > 30) {
        risk_score += 15;
      } else if (max_days_overdue > 0) {
        risk_score += 10;
      }

      // Factor 3: Outstanding balance (0-20 points)
      if (total_outstanding > 200000) {
        risk_score += 20;
      } else if (total_outstanding > 100000) {
        risk_score += 15;
      } else if (total_outstanding > 50000) {
        risk_score += 10;
      } else if (total_outstanding > 25000) {
        risk_score += 5;
      }

      // Factor 4: Payment consistency (0-15 points)
      const payment_rate = total_credit_given > 0 ? (total_paid / total_credit_given) : 0;
      if (payment_rate < 0.5) {
        risk_score += 15;
      } else if (payment_rate < 0.7) {
        risk_score += 10;
      } else if (payment_rate < 0.85) {
        risk_score += 5;
      }

      // Factor 5: Partial payments indicator (0-10 points)
      const partial_ratio = partial_count / total_invoices;
      if (partial_ratio > 0.5) {
        risk_score += 10;
      } else if (partial_ratio > 0.3) {
        risk_score += 5;
      }
    }

    // Determine risk flag based on risk score
    let risk_flag = 'green';
    
    if (risk_score >= 60) {
      risk_flag = 'red';
    } else if (risk_score >= 30) {
      risk_flag = 'yellow';
    } else {
      risk_flag = 'green';
    }

    // Special cases that override calculation
    // Immediate red flag conditions
    if (max_days_overdue > 180 || total_outstanding > 500000) {
      risk_flag = 'red';
    }

    // Update customer flag only if changed
    const currentFlag = customerResult.rows[0].risk_flag;
    if (currentFlag !== risk_flag) {
      await client.query(
        'UPDATE customers SET risk_flag = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [risk_flag, customer_id]
      );
    }
  } catch (error) {
    console.error(`Error calculating customer flag for customer ${customer_id}:`, error);
    // Don't throw - this should not break the transaction
  }
}
