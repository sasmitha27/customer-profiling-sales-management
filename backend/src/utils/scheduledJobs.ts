/**
 * Scheduled Jobs for System Maintenance
 * Run these jobs daily for optimal system performance and accuracy
 */

import { getClient } from '../database/db';
import { calculateCustomerFlag } from '../utils/flagCalculator';
import { logger } from '../utils/logger';

/**
 * Mark overdue invoices and installments, and create late payment records
 * Should run daily at midnight
 */
export async function markOverdueInvoices(): Promise<void> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Mark overdue invoices
    const invoiceResult = await client.query(
      `UPDATE invoices
       SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
       WHERE status IN ('pending', 'partial')
         AND due_date < CURRENT_DATE
         AND remaining_balance > 0
       RETURNING id`
    );

    // Mark overdue installments and create late payment records
    const installmentResult = await client.query(
      `UPDATE installment_schedule
       SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending'
         AND due_date < CURRENT_DATE
         AND paid_amount < amount
       RETURNING id, invoice_id, installment_number, due_date, amount, paid_amount`
    );

    // Create late payment records for overdue installments without payments
    let latePaymentsCreated = 0;
    for (const installment of installmentResult.rows) {
      // Check if late payment record already exists
      const existingRecord = await client.query(
        'SELECT id FROM late_payments WHERE installment_id = $1',
        [installment.id]
      );

      if (existingRecord.rows.length === 0 && parseFloat(installment.paid_amount) === 0) {
        // Get invoice, customer details, and last payment date
        const invoiceData = await client.query(
          `SELECT 
             i.invoice_number, 
             i.customer_id, 
             COALESCE(s.sale_date::date, i.created_at::date) as invoice_date,
             CURRENT_DATE - ins.due_date as days_overdue,
             (
               SELECT MAX(p.payment_date)
               FROM payments p
               WHERE p.invoice_id = i.id
             ) as last_payment_date,
             -- Calculate days from invoice date if no payments, or from last payment date if payments exist
             CASE 
               WHEN EXISTS(SELECT 1 FROM payments p WHERE p.invoice_id = i.id) THEN
                 CURRENT_DATE - (SELECT MAX(p.payment_date) FROM payments p WHERE p.invoice_id = i.id)
               ELSE
                 CURRENT_DATE - COALESCE(s.sale_date::date, i.created_at::date)
             END as days_since_reference
           FROM invoices i
           JOIN installment_schedule ins ON ins.invoice_id = i.id
           LEFT JOIN sales s ON i.sale_id = s.id
           WHERE ins.id = $1`,
          [installment.id]
        );

        if (invoiceData.rows.length > 0) {
          const { invoice_number, customer_id, days_overdue, last_payment_date, days_since_reference } = invoiceData.rows[0];
          
          // Determine priority based on days since reference (invoice date or last payment)
          let priority = 'normal';
          if (days_since_reference >= 60) {
            priority = 'high_priority';
          } else if (days_since_reference >= 35) {
            priority = 'late';
          }
          
          await client.query(
            `INSERT INTO late_payments (
              installment_id, invoice_id, customer_id, invoice_number, 
              installment_number, due_date, amount_due, days_overdue, priority, status, last_payment_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              installment.id,
              installment.invoice_id,
              customer_id,
              invoice_number,
              installment.installment_number,
              installment.due_date,
              parseFloat(installment.amount) - parseFloat(installment.paid_amount),
              days_overdue,
              priority,
              'pending',
              last_payment_date
            ]
          );
          latePaymentsCreated++;
        }
      } else if (existingRecord.rows.length > 0) {
        // Update days overdue, last payment date, and priority for existing records
        await client.query(
          `UPDATE late_payments lp
           SET days_overdue = CURRENT_DATE - lp.due_date,
               last_payment_date = (
                 SELECT MAX(p.payment_date)
                 FROM payments p
                 WHERE p.invoice_id = lp.invoice_id
               ),
               priority = CASE 
                 -- If there are payments, count from last payment date
                 WHEN EXISTS(SELECT 1 FROM payments p WHERE p.invoice_id = lp.invoice_id) THEN
                   CASE 
                     WHEN CURRENT_DATE - (SELECT MAX(p.payment_date) FROM payments p WHERE p.invoice_id = lp.invoice_id) >= 60 THEN 'high_priority'
                     WHEN CURRENT_DATE - (SELECT MAX(p.payment_date) FROM payments p WHERE p.invoice_id = lp.invoice_id) >= 35 THEN 'late'
                     ELSE 'normal'
                   END
                 -- If no payments, count from invoice date
                   ELSE
                   CASE 
                     WHEN CURRENT_DATE - (SELECT COALESCE(s.sale_date::date, i.created_at::date) FROM invoices i LEFT JOIN sales s ON i.sale_id = s.id WHERE i.id = lp.invoice_id) >= 60 THEN 'high_priority'
                     WHEN CURRENT_DATE - (SELECT COALESCE(s.sale_date::date, i.created_at::date) FROM invoices i LEFT JOIN sales s ON i.sale_id = s.id WHERE i.id = lp.invoice_id) >= 35 THEN 'late'
                     ELSE 'normal'
                   END
               END,
               updated_at = CURRENT_TIMESTAMP
           WHERE installment_id = $1 AND status != 'resolved'`,
          [installment.id]
        );
      }
    }

    await client.query('COMMIT');

    logger.info(`Marked ${invoiceResult.rows.length} invoices and ${installmentResult.rows.length} installments as overdue. Created ${latePaymentsCreated} late payment records.`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error marking overdue invoices:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Recalculate all customer risk flags
 * Should run daily
 */
export async function recalculateAllRiskFlags(): Promise<void> {
  const client = await getClient();
  
  try {
    // Get all customers with invoices who don't have manual override
    const result = await client.query(
      `SELECT DISTINCT c.id
       FROM customers c
       INNER JOIN invoices i ON c.id = i.customer_id
       WHERE c.flag_override = FALSE
       ORDER BY c.id`
    );

    let updated = 0;
    for (const row of result.rows) {
      try {
        await calculateCustomerFlag(client, row.id);
        updated++;
      } catch (error) {
        logger.error(`Error calculating flag for customer ${row.id}:`, error);
      }
    }

    logger.info(`Recalculated risk flags for ${updated} customers`);
  } catch (error) {
    logger.error('Error recalculating risk flags:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Refresh materialized views for dashboard
 * Should run every hour or after major data changes
 */
export async function refreshDashboardViews(): Promise<void> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Refresh dashboard stats materialized view
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats');

    // Could add more materialized views here

    await client.query('COMMIT');

    logger.info('Dashboard views refreshed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error refreshing dashboard views:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean up old audit logs (archive logs older than 2 years)
 * Should run monthly
 */
export async function archiveOldAuditLogs(): Promise<void> {
  const client = await getClient();
  
  try {
    // Count logs to archive
    const countResult = await client.query(
      `SELECT COUNT(*) as count
       FROM audit_logs
       WHERE created_at < CURRENT_DATE - INTERVAL '2 years'`
    );

    const count = parseInt(countResult.rows[0].count);

    if (count > 0) {
      // In production, you would export to archive storage before deleting
      // For now, we'll keep them (audit logs table has protection rules)
      logger.info(`Found ${count} audit logs older than 2 years. Consider archiving.`);
    } else {
      logger.info('No audit logs require archiving');
    }
  } catch (error) {
    logger.error('Error archiving audit logs:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Generate payment reminders for upcoming due dates
 * Should run daily
 */
export async function generatePaymentReminders(): Promise<void> {
  const client = await getClient();
  
  try {
    // Find invoices due in next 7 days
    const result = await client.query(
      `SELECT 
        i.id, i.invoice_number, i.customer_id, i.total_amount, 
        i.remaining_balance, i.due_date,
        c.name, c.mobile_primary, c.email, c.risk_flag
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('pending', 'partial')
         AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND i.remaining_balance > 0
       ORDER BY i.due_date ASC`
    );

    // Log reminders (in production, send SMS/email)
    for (const invoice of result.rows) {
      logger.info(
        `Reminder: Customer ${invoice.name} (${invoice.mobile_primary}) ` +
        `has invoice ${invoice.invoice_number} due on ${invoice.due_date}. ` +
        `Remaining: LKR ${invoice.remaining_balance}`
      );

      // Insert reminder record (create reminders table if needed)
      // await client.query(...)
    }

    logger.info(`Generated ${result.rows.length} payment reminders`);
  } catch (error) {
    logger.error('Error generating payment reminders:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update fast-moving product flags based on sales velocity
 * Should run weekly
 */
export async function updateFastMovingProducts(): Promise<void> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // Products sold more than 20 times in last 30 days are fast-moving
    const result = await client.query(
      `WITH product_sales AS (
        SELECT 
          p.id,
          COUNT(si.id) as sale_count,
          SUM(si.quantity) as total_quantity
        FROM products p
        LEFT JOIN sales_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND s.status = 'completed'
        GROUP BY p.id
      )
      UPDATE products p
      SET is_fast_moving = (ps.total_quantity > 20)
      FROM product_sales ps
      WHERE p.id = ps.id
      RETURNING p.id, p.name, p.is_fast_moving`
    );

    await client.query('COMMIT');

    logger.info(`Updated fast-moving flags for ${result.rows.length} products`);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating fast-moving products:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Master job scheduler - runs all maintenance tasks
 */
export async function runDailyMaintenance(): Promise<void> {
  logger.info('Starting daily maintenance tasks...');
  
  try {
    await markOverdueInvoices();
    await recalculateAllRiskFlags();
    await refreshDashboardViews();
    await generatePaymentReminders();
    
    logger.info('Daily maintenance completed successfully');
  } catch (error) {
    logger.error('Daily maintenance failed:', error);
    throw error;
  }
}

/**
 * Weekly maintenance tasks
 */
export async function runWeeklyMaintenance(): Promise<void> {
  logger.info('Starting weekly maintenance tasks...');
  
  try {
    await updateFastMovingProducts();
    
    logger.info('Weekly maintenance completed successfully');
  } catch (error) {
    logger.error('Weekly maintenance failed:', error);
    throw error;
  }
}
