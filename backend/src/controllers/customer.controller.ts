import { Response, NextFunction } from 'express';
import { query, getClient } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { clearCachePattern } from '../config/redis';

export async function createCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const {
      name, nic, dob, gender, mobile_primary, mobile_secondary, email,
      permanent_address, current_address, notes,
      employment, guarantor
    } = req.body;

    // Basic sanitization and normalization
    const nameClean = (name || '').toString().trim();
    const nicClean = (nic || '').toString().trim();
    const genderClean = (gender || '').toString().trim();
    const mobilePrimaryRaw = (mobile_primary || '').toString().trim();
    const mobileSecondaryRaw = (mobile_secondary || '').toString().trim();
    const permanentAddressClean = (permanent_address || '').toString().trim();
    const currentAddressClean = (current_address || '').toString().trim() || null;
    const emailClean = (email || '').toString().trim() || null;
    const notesClean = (notes || '').toString().trim() || null;

    // Validate required fields
    if (!nameClean || !nicClean || !dob || !genderClean || !mobilePrimaryRaw || !permanentAddressClean) {
      throw new AppError('Missing required fields: name, nic, dob, gender, mobile_primary, permanent_address are required', 400);
    }

    // Validate NIC format (Sri Lankan NIC: 9 digits + V/X or 12 digits)
    const nicPattern = /^[0-9]{9}[VvXx]$|^[0-9]{12}$/;
    if (!nicPattern.test(nicClean)) {
      throw new AppError('Invalid NIC format. Use 9 digits + V/X or 12 digits', 400);
    }

    // Validate mobile format - accept +94 or leading 0 or plain 10 digits
    const mobilePattern = /^(?:\+94|0)?[0-9]{9,10}$/;
    if (!mobilePattern.test(mobilePrimaryRaw)) {
      throw new AppError('Invalid primary mobile format. Use +94xxxxxxxxx or 0xxxxxxxxx', 400);
    }
    if (mobileSecondaryRaw && !mobilePattern.test(mobileSecondaryRaw)) {
      throw new AppError('Invalid secondary mobile format. Use +94xxxxxxxxx or 0xxxxxxxxx', 400);
    }

    // Validate DOB (must be at least 18 years old, not in future)
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      throw new AppError('Invalid date of birth format', 400);
    }
    const today = new Date();
    const age = (today.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18) {
      throw new AppError('Customer must be at least 18 years old', 400);
    }
    if (dobDate > today) {
      throw new AppError('Date of birth cannot be in the future', 400);
    }

    // Check for duplicate NIC
    const existingCustomer = await client.query(
      'SELECT id FROM customers WHERE UPPER(nic) = UPPER($1)',
      [nicClean]
    );
    if (existingCustomer.rows.length > 0) {
      throw new AppError('Customer with this NIC already exists', 409);
    }

    // Create customer
    // Prepare insert params (coerce empty strings to null where appropriate)
    const dobParam = dobDate.toISOString().slice(0, 10);
    const mobilePrimaryParam = mobilePrimaryRaw;
    const mobileSecondaryParam = mobileSecondaryRaw || null;
    const currentAddressParam = currentAddressClean || null;
    const emailParam = emailClean || null;
    const notesParam = notesClean || null;

    const customerResult = await client.query(
      `INSERT INTO customers (
        name, nic, dob, gender, mobile_primary, mobile_secondary, email,
        permanent_address, current_address, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [nameClean, nicClean, dobParam, genderClean, mobilePrimaryParam, mobileSecondaryParam, emailParam,
        permanentAddressClean, currentAddressParam, notesParam, req.user!.id]
    );

    const customer = customerResult.rows[0];

    // Add employment details if provided
    if (employment) {
      // Validate employment data
      if (!employment.employment_type || !employment.company_name || !employment.monthly_salary) {
        throw new AppError('Employment type, company name, and monthly salary are required for employment details', 400);
      }
      
      if (parseFloat(employment.monthly_salary) <= 0) {
        throw new AppError('Monthly salary must be greater than 0', 400);
      }

      const empStartDate = employment.start_date && employment.start_date.toString().trim() !== '' ? new Date(employment.start_date) : null;
      if (empStartDate && isNaN(empStartDate.getTime())) {
        throw new AppError('Invalid employment start date format', 400);
      }

      await client.query(
        `INSERT INTO customer_employment (
          customer_id, employment_type, company_name, job_title,
          work_address, monthly_salary, payment_type, start_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [customer.id, employment.employment_type, employment.company_name,
          employment.job_title, employment.work_address, employment.monthly_salary,
          employment.payment_type, empStartDate ? empStartDate.toISOString().slice(0,10) : null]
      );
    }

    // Add guarantor if provided
    if (guarantor) {
      // Validate guarantor data
      if (!guarantor.name || !guarantor.nic || !guarantor.mobile || !guarantor.address) {
        throw new AppError('Guarantor name, NIC, mobile, and address are required', 400);
      }

      // Validate guarantor NIC
      if (!nicPattern.test(guarantor.nic)) {
        throw new AppError('Invalid guarantor NIC format', 400);
      }

      // Validate guarantor mobile
      if (!mobilePattern.test(guarantor.mobile)) {
        throw new AppError('Invalid guarantor mobile format', 400);
      }

      await client.query(
        `INSERT INTO guarantors (
          customer_id, name, nic, mobile, address, workplace, relationship
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [customer.id, guarantor.name, guarantor.nic, guarantor.mobile,
          guarantor.address, guarantor.workplace, guarantor.relationship]
      );
    }

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'CREATE_CUSTOMER', 'customer', customer.id, JSON.stringify(customer)]
    );

    await client.query('COMMIT');
    await clearCachePattern('customers:*');

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // Map common Postgres errors to friendly AppError responses
    const errAny: any = error;
    if (errAny && errAny.code === '23505') {
      // unique_violation
      const detail = errAny.detail || 'Duplicate entry';
      return next(new AppError(detail, 409));
    }
    next(error);
  } finally {
    client.release();
  }
}

export async function getCustomers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, search, risk_flag, sort = 'created_at', order = 'DESC' } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR nic ILIKE $${paramIndex} OR mobile_primary ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (risk_flag) {
      whereClause += ` AND risk_flag = $${paramIndex}`;
      params.push(risk_flag);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM customers ${whereClause}`,
      params
    );

    const result = await query(
      `SELECT c.*, 
        ce.employment_type, ce.company_name, ce.monthly_salary,
        COUNT(DISTINCT s.id) as total_sales,
        COALESCE(SUM(i.remaining_balance), 0) as outstanding_balance
      FROM customers c
      LEFT JOIN customer_employment ce ON c.id = ce.customer_id
      LEFT JOIN sales s ON c.id = s.customer_id
      LEFT JOIN invoices i ON c.id = i.customer_id AND i.status != 'paid'
      ${whereClause}
      GROUP BY c.id, ce.employment_type, ce.company_name, ce.monthly_salary
      ORDER BY ${sort} ${order}
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

export async function getCustomerById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerWithDetails(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const customerResult = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const employmentResult = await query(
      'SELECT * FROM customer_employment WHERE customer_id = $1',
      [id]
    );

    const guarantorResult = await query(
      'SELECT * FROM guarantors WHERE customer_id = $1',
      [id]
    );

    const documentsResult = await query(
      'SELECT id, document_type, file_name, file_size, uploaded_at FROM documents WHERE customer_id = $1',
      [id]
    );

    const salesResult = await query(
      'SELECT * FROM sales WHERE customer_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const invoicesResult = await query(
      'SELECT * FROM invoices WHERE customer_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const paymentsResult = await query(
      'SELECT * FROM payments WHERE customer_id = $1 ORDER BY payment_date DESC LIMIT 10',
      [id]
    );

    // Flatten the response - merge all data into the customer object
    const customerData = {
      ...customerResult.rows[0],
      employment: employmentResult.rows[0] || null,
      guarantors: guarantorResult.rows,
      documents: documentsResult.rows,
      sales: salesResult.rows,
      invoices: invoicesResult.rows,
      recentPayments: paymentsResult.rows,
    };

    res.json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const updateData = req.body;

    // Get old values for audit
    const oldResult = await client.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'nic', 'dob', 'gender', 'mobile_primary', 'mobile_secondary',
      'email', 'permanent_address', 'current_address', 'notes'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id);
    const result = await client.query(
      `UPDATE customers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Update employment if provided
    if (updateData.employment) {
      await client.query(
        `INSERT INTO customer_employment (
          customer_id, employment_type, company_name, job_title,
          work_address, monthly_salary, payment_type, start_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (customer_id) DO UPDATE SET
          employment_type = EXCLUDED.employment_type,
          company_name = EXCLUDED.company_name,
          job_title = EXCLUDED.job_title,
          work_address = EXCLUDED.work_address,
          monthly_salary = EXCLUDED.monthly_salary,
          payment_type = EXCLUDED.payment_type,
          start_date = EXCLUDED.start_date`,
        [id, updateData.employment.employment_type, updateData.employment.company_name,
          updateData.employment.job_title, updateData.employment.work_address,
          updateData.employment.monthly_salary, updateData.employment.payment_type,
          updateData.employment.start_date]
      );
    }

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user!.id, 'UPDATE_CUSTOMER', 'customer', id, JSON.stringify(oldResult.rows[0]), JSON.stringify(result.rows[0])]
    );

    await client.query('COMMIT');
    await clearCachePattern('customers:*');

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function updateCustomerFlag(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { risk_flag } = req.body;

    if (!['green', 'yellow', 'red'].includes(risk_flag)) {
      throw new AppError('Invalid risk flag', 400);
    }

    const result = await query(
      'UPDATE customers SET risk_flag = $1, flag_override = TRUE WHERE id = $2 RETURNING *',
      [risk_flag, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    // Audit log
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'UPDATE_CUSTOMER_FLAG', 'customer', id, JSON.stringify({ risk_flag })]
    );

    await clearCachePattern('customers:*');

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    // Audit log
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user!.id, 'DELETE_CUSTOMER', 'customer', id]
    );

    await clearCachePattern('customers:*');

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
