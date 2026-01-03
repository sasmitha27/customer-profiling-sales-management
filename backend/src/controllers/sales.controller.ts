import { Response, NextFunction } from 'express';
import { query, getClient } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { clearCachePattern } from '../config/redis';
import { addMonths, format } from 'date-fns';

export async function createSale(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { customer_id, items, payment_type, installment_duration, payment_day_of_month = 1, down_payment = 0, sale_date } = req.body;

    console.log('Received sale_date:', sale_date);

    // Enhanced validation
    if (!customer_id || !items || items.length === 0 || !payment_type) {
      throw new AppError('Missing required fields: customer_id, items, and payment_type are required', 400);
    }

    if (!['cash', 'credit', 'installment'].includes(payment_type)) {
      throw new AppError('Invalid payment_type. Must be: cash, credit, or installment', 400);
    }

    if (payment_type === 'installment' && (!installment_duration || installment_duration < 1 || installment_duration > 6)) {
      throw new AppError('Installment duration must be between 1 and 6 months for installment sales', 400);
    }

    if (payment_type === 'installment' && (payment_day_of_month < 1 || payment_day_of_month > 28)) {
      throw new AppError('Payment day of month must be between 1 and 28', 400);
    }

    // Verify customer exists
    const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (customerCheck.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    // Validate and calculate total amount with stock checking
    let total_amount = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        throw new AppError('Each item must have a valid product_id and quantity > 0', 400);
      }

      const productResult = await client.query(
        'SELECT id, name, selling_price, stock_quantity, is_active FROM products WHERE id = $1',
        [item.product_id]
      );
      
      if (productResult.rows.length === 0) {
        throw new AppError(`Product with ID ${item.product_id} not found`, 404);
      }

      const product = productResult.rows[0];

      if (!product.is_active) {
        throw new AppError(`Product "${product.name}" is not active`, 400);
      }
      
      if (product.stock_quantity < item.quantity) {
        throw new AppError(
          `Insufficient stock for product "${product.name}". Available: ${product.stock_quantity}, Requested: ${item.quantity}`,
          400
        );
      }

      const item_total = parseFloat(product.selling_price) * parseInt(item.quantity);
      total_amount += item_total;
      
      validatedItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(product.selling_price),
        total_price: item_total
      });
    }

    if (total_amount <= 0) {
      throw new AppError('Total amount must be greater than 0', 400);
    }

    // Validate down payment
    const downPaymentAmount = parseFloat(down_payment) || 0;
    if (downPaymentAmount < 0) {
      throw new AppError('Down payment cannot be negative', 400);
    }
    if (downPaymentAmount > total_amount) {
      throw new AppError('Down payment cannot be greater than total amount', 400);
    }

    // Calculate remaining balance after down payment
    const remaining_balance = total_amount - downPaymentAmount;

    // Calculate monthly installment with proper rounding on the remaining balance
    let monthly_installment = null;
    if (payment_type === 'installment' && installment_duration) {
      monthly_installment = Math.ceil((remaining_balance / installment_duration) * 100) / 100;
    }

    // Create sale with unique sale number
    const sale_number = `SALE-${Date.now()}${customer_id}`;

    // Parse and validate sale_date - keep as string if already in YYYY-MM-DD format
    let saleDateValue: string;
    if (sale_date) {
      // If it's already in YYYY-MM-DD format, use it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(sale_date)) {
        saleDateValue = sale_date;
      } else {
        saleDateValue = new Date(sale_date).toISOString().split('T')[0];
      }
    } else {
      saleDateValue = new Date().toISOString().split('T')[0];
    }
    
    console.log('Final saleDateValue to insert:', saleDateValue);

    const saleResult = await client.query(
      `INSERT INTO sales (sale_number, customer_id, sale_date, total_amount, payment_type, installment_duration, payment_day_of_month, monthly_installment, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [sale_number, customer_id, saleDateValue, total_amount, payment_type, installment_duration, payment_day_of_month, monthly_installment, 'completed', req.user!.id]
    );

    const sale = saleResult.rows[0];

    // Create sale items and update stock atomically
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, item.product_id, item.quantity, item.unit_price, item.total_price]
      );

      // Update stock atomically with row locking
      const stockUpdate = await client.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND stock_quantity >= $1
         RETURNING stock_quantity`,
        [item.quantity, item.product_id]
      );

      if (stockUpdate.rows.length === 0) {
        throw new AppError(`Failed to update stock for product ID ${item.product_id}. Concurrent update detected.`, 409);
      }
    }

    // Create invoice number using a DB sequence, formatted as 6-digit zero-padded with INV- prefix
    // Ensure sequence exists and is set to current max to avoid duplicates
    await client.query(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1`);
    const maxRes = await client.query(
      `SELECT COALESCE(MAX((regexp_replace(invoice_number, '^INV-', ''))::bigint), 0) as max FROM invoices`
    );
    const currentMax = parseInt(maxRes.rows[0].max || '0', 10) || 0;
    if (currentMax > 0) {
      // set sequence last value to currentMax so nextval returns currentMax+1
      await client.query(`SELECT setval('invoice_number_seq', $1)`, [currentMax]);
    }
    const seqRes = await client.query(`SELECT nextval('invoice_number_seq') as seq`);
    const seq = seqRes.rows[0].seq;
    const invoice_number = `INV-${String(seq).padStart(6, '0')}`;
    let due_date: Date;
    
    if (payment_type === 'cash') {
      due_date = new Date(); // Due immediately
    } else if (payment_type === 'credit') {
      due_date = addMonths(new Date(), 1); // 30 days credit
    } else if (payment_type === 'installment') {
      due_date = addMonths(new Date(), 1); // First installment in 30 days
    } else {
      due_date = new Date();
    }

    const invoiceResult = await client.query(
      `INSERT INTO invoices (invoice_number, sale_id, customer_id, total_amount, paid_amount, remaining_balance, due_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        invoice_number,
        sale.id,
        customer_id,
        total_amount,
        downPaymentAmount,
        remaining_balance,
        due_date,
        remaining_balance === 0 ? 'paid' : 'pending',
        sale.sale_date || saleDateValue
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Create installment schedule if applicable with proper amount distribution
    if (payment_type === 'installment' && installment_duration && monthly_installment) {
      let remaining_to_allocate = remaining_balance; // Use remaining balance after down payment
      
      for (let i = 1; i <= installment_duration; i++) {
        // Calculate due date using payment_day_of_month
        let installment_due_date = addMonths(new Date(), i);
        installment_due_date.setDate(payment_day_of_month);
        
        // Last installment gets the remaining amount to handle rounding
        let installment_amount = monthly_installment;
        if (i === installment_duration) {
          installment_amount = remaining_to_allocate;
        } else {
          remaining_to_allocate -= monthly_installment;
        }

        await client.query(
          `INSERT INTO installment_schedule (invoice_id, installment_number, due_date, amount, paid_amount, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoice.id, i, installment_due_date, installment_amount, 0, 'pending']
        );
      }
    }

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'CREATE_SALE', 'sale', sale.id, JSON.stringify(sale)]
    );

    await client.query('COMMIT');
    await clearCachePattern('sales:*');
    await clearCachePattern('invoices:*');
    await clearCachePattern('products:*');

    res.status(201).json({
      success: true,
      data: { sale, invoice },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function getSales(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, customer_id, payment_type, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (customer_id) {
      whereClause += ` AND customer_id = $${paramIndex}`;
      params.push(customer_id);
      paramIndex++;
    }

    if (payment_type) {
      whereClause += ` AND payment_type = $${paramIndex}`;
      params.push(payment_type);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM sales ${whereClause}`, params);

    const result = await query(
      `SELECT s.*, c.name as customer_name, c.nic as customer_nic, i.invoice_number
       FROM sales s
       JOIN customers c ON s.customer_id = c.id
       LEFT JOIN invoices i ON i.sale_id = s.id
       ${whereClause}
       ORDER BY s.created_at DESC
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

export async function getSaleById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const saleResult = await query(
      `SELECT s.*, c.name as customer_name, c.nic as customer_nic, c.mobile_primary, 
              c.mobile_secondary, c.email as customer_email, c.permanent_address as customer_address,
              c.dob as customer_dob, c.gender as customer_gender
       FROM sales s
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (saleResult.rows.length === 0) {
      throw new AppError('Sale not found', 404);
    }

    const itemsResult = await query(
      `SELECT si.*, p.name as product_name, p.sku
       FROM sales_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [id]
    );

    const invoiceResult = await query(
      'SELECT * FROM invoices WHERE sale_id = $1',
      [id]
    );

    const guarantorsResult = await query(
      `SELECT g.* FROM guarantors g
       WHERE g.customer_id = $1`,
      [saleResult.rows[0].customer_id]
    );

    const installmentsResult = await query(
      `SELECT * FROM installment_schedule 
       WHERE invoice_id = $1 
       ORDER BY installment_number`,
      [invoiceResult.rows[0]?.id]
    );

    res.json({
      success: true,
      data: {
        ...saleResult.rows[0],
        items: itemsResult.rows,
        invoice: invoiceResult.rows[0] || null,
        guarantors: guarantorsResult.rows,
        installments: installmentsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSaleStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const result = await query(
      'UPDATE sales SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Sale not found', 404);
    }

    await clearCachePattern('sales:*');

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSale(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const result = await query('UPDATE sales SET status = $1 WHERE id = $2 RETURNING *', ['cancelled', id]);

    if (result.rows.length === 0) {
      throw new AppError('Sale not found', 404);
    }

    await clearCachePattern('sales:*');

    res.json({
      success: true,
      message: 'Sale cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
}
