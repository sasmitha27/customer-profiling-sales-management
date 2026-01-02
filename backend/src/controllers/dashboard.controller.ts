import { Response, NextFunction } from 'express';
import { query } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { getCachedData, setCachedData } from '../config/redis';

export async function getSalesDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { period = 'month' } = req.query;
    const cacheKey = `dashboard:sales:${period}`;
    
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    let dateFilter = '';
    switch (period) {
      case 'day':
        dateFilter = "AND s.created_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND s.created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
    }

    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_sale_value,
        COUNT(CASE WHEN payment_type = 'cash' THEN 1 END) as cash_sales,
        COUNT(CASE WHEN payment_type = 'credit' THEN 1 END) as credit_sales,
        COUNT(CASE WHEN payment_type = 'installment' THEN 1 END) as installment_sales
       FROM sales s
       WHERE s.status != 'cancelled' ${dateFilter}`
    );

    const trendResult = await query(
      `SELECT 
        DATE(s.created_at) as date,
        COUNT(*) as sales_count,
        SUM(s.total_amount) as revenue
       FROM sales s
       WHERE s.status != 'cancelled' ${dateFilter}
       GROUP BY DATE(s.created_at)
       ORDER BY date DESC
       LIMIT 30`
    );

    const topCustomersResult = await query(
      `SELECT 
        c.id, c.name, c.nic,
        COUNT(s.id) as purchase_count,
        SUM(s.total_amount) as total_spent
       FROM customers c
       JOIN sales s ON c.id = s.customer_id
       WHERE s.status != 'cancelled' ${dateFilter}
       GROUP BY c.id, c.name, c.nic
       ORDER BY total_spent DESC
       LIMIT 10`
    );

    const data = {
      summary: summaryResult.rows[0],
      trend: trendResult.rows,
      topCustomers: topCustomersResult.rows,
    };

    await setCachedData(cacheKey, data, 300); // Cache for 5 minutes

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPaymentDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cacheKey = 'dashboard:payments';
    
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const summaryResult = await query(
      `SELECT 
        COALESCE(SUM(remaining_balance), 0) as total_outstanding,
        COUNT(CASE WHEN status IN ('pending', 'partial', 'overdue') THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN remaining_balance ELSE 0 END), 0) as overdue_amount
       FROM invoices`
    );

    const agingResult = await query(
      `SELECT 
        COUNT(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer <= 30 THEN 1 END) as aging_0_30,
        COUNT(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer BETWEEN 31 AND 60 THEN 1 END) as aging_31_60,
        COUNT(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer BETWEEN 61 AND 90 THEN 1 END) as aging_61_90,
        COUNT(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer > 90 THEN 1 END) as aging_90_plus,
        COALESCE(SUM(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer <= 30 THEN remaining_balance ELSE 0 END), 0) as amount_0_30,
        COALESCE(SUM(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer BETWEEN 31 AND 60 THEN remaining_balance ELSE 0 END), 0) as amount_31_60,
        COALESCE(SUM(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer BETWEEN 61 AND 90 THEN remaining_balance ELSE 0 END), 0) as amount_61_90,
        COALESCE(SUM(CASE WHEN EXTRACT(DAY FROM AGE(CURRENT_DATE, due_date))::integer > 90 THEN remaining_balance ELSE 0 END), 0) as amount_90_plus
       FROM invoices
       WHERE status IN ('pending', 'partial', 'overdue')`
    );

    const recentPaymentsResult = await query(
      `SELECT p.*, c.name as customer_name, i.invoice_number
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       JOIN invoices i ON p.invoice_id = i.id
       ORDER BY p.created_at DESC
       LIMIT 10`
    );

    const data = {
      summary: summaryResult.rows[0],
      aging: agingResult.rows[0],
      recentPayments: recentPaymentsResult.rows,
    };

    await setCachedData(cacheKey, data, 300);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cacheKey = 'dashboard:products';
    
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const topProductsResult = await query(
      `SELECT 
        p.id, p.name, p.sku, p.category,
        COUNT(si.id) as times_sold,
        SUM(si.quantity) as total_quantity_sold,
        SUM(si.total_price) as total_revenue
       FROM products p
       LEFT JOIN sales_items si ON p.id = si.product_id
       GROUP BY p.id, p.name, p.sku, p.category
       ORDER BY total_revenue DESC NULLS LAST
       LIMIT 10`
    );

    const categoryStatsResult = await query(
      `SELECT 
        p.category,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(si.total_price), 0) as total_revenue,
        COALESCE(SUM(si.quantity), 0) as total_quantity_sold
       FROM products p
       LEFT JOIN sales_items si ON p.id = si.product_id
       WHERE p.category IS NOT NULL
       GROUP BY p.category
       ORDER BY total_revenue DESC`
    );

    const lowStockResult = await query(
      `SELECT id, name, sku, category, stock_quantity
       FROM products
       WHERE stock_quantity < 10 AND is_active = TRUE
       ORDER BY stock_quantity ASC
       LIMIT 20`
    );

    const fastMovingResult = await query(
      `SELECT id, name, sku, category, is_fast_moving
       FROM products
       WHERE is_fast_moving = TRUE AND is_active = TRUE
       LIMIT 10`
    );

    const data = {
      topProducts: topProductsResult.rows,
      categoryStats: categoryStatsResult.rows,
      lowStock: lowStockResult.rows,
      fastMoving: fastMovingResult.rows,
    };

    await setCachedData(cacheKey, data, 600);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cacheKey = 'dashboard:customers';
    
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN risk_flag = 'green' THEN 1 END) as green_flag_count,
        COUNT(CASE WHEN risk_flag = 'yellow' THEN 1 END) as yellow_flag_count,
        COUNT(CASE WHEN risk_flag = 'red' THEN 1 END) as red_flag_count
       FROM customers`
    );

    const highValueResult = await query(
      `SELECT 
        c.id, c.name, c.nic, c.risk_flag,
        COUNT(s.id) as total_purchases,
        COALESCE(SUM(s.total_amount), 0) as total_spent,
        COALESCE(SUM(i.remaining_balance), 0) as outstanding_balance
       FROM customers c
       LEFT JOIN sales s ON c.id = s.customer_id
       LEFT JOIN invoices i ON c.id = i.customer_id AND i.status != 'paid'
       GROUP BY c.id, c.name, c.nic, c.risk_flag
       ORDER BY total_spent DESC
       LIMIT 10`
    );

    const repeatCustomersResult = await query(
      `SELECT 
        c.id, c.name, c.nic,
        COUNT(s.id) as purchase_count
       FROM customers c
       JOIN sales s ON c.id = s.customer_id
       GROUP BY c.id, c.name, c.nic
       HAVING COUNT(s.id) > 1
       ORDER BY purchase_count DESC
       LIMIT 10`
    );

    const data = {
      summary: summaryResult.rows[0],
      highValue: highValueResult.rows,
      repeatCustomers: repeatCustomersResult.rows,
    };

    await setCachedData(cacheKey, data, 600);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLatePaymentsDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dueTodayResult = await query(
      `SELECT 
        i.*, c.name as customer_name, c.nic, c.mobile_primary, c.risk_flag
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('pending', 'partial')
       AND i.due_date = CURRENT_DATE
       ORDER BY i.remaining_balance DESC`
    );

    const overdueResult = await query(
      `SELECT 
        i.*, c.name as customer_name, c.nic, c.mobile_primary, c.risk_flag,
        EXTRACT(DAY FROM (CURRENT_DATE - i.due_date)) as days_overdue
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('pending', 'partial', 'overdue')
       AND i.due_date < CURRENT_DATE
       ORDER BY i.remaining_balance DESC, days_overdue DESC`
    );

    const upcomingResult = await query(
      `SELECT 
        i.*, c.name as customer_name, c.nic, c.mobile_primary
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('pending', 'partial')
       AND i.due_date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 7
       ORDER BY i.due_date ASC`
    );

    res.json({
      success: true,
      data: {
        dueToday: dueTodayResult.rows,
        overdue: overdueResult.rows,
        upcoming: upcomingResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}
