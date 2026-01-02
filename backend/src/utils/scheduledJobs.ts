/**
 * Scheduled Jobs for System Maintenance
 * Run these jobs daily for optimal system performance and accuracy
 */

import { getClient } from '../database/db';
import { calculateCustomerFlag } from '../utils/flagCalculator';
import { logger } from '../utils/logger';

/**
 * Mark overdue invoices and installments
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

    // Mark overdue installments
    const installmentResult = await client.query(
      `UPDATE installment_schedule
       SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending'
         AND due_date < CURRENT_DATE
         AND paid_amount < amount
       RETURNING id`
    );

    await client.query('COMMIT');

    logger.info(`Marked ${invoiceResult.rows.length} invoices and ${installmentResult.rows.length} installments as overdue`);
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
