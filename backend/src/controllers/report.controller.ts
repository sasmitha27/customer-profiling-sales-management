import { Response, NextFunction } from 'express';
import { query } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export async function generateSalesReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { format = 'json', start_date, end_date } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      dateFilter += ` AND s.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      dateFilter += ` AND s.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
        s.*, c.name as customer_name, c.nic,
        COUNT(si.id) as item_count,
        u.username as created_by_user
       FROM sales s
       JOIN customers c ON s.customer_id = c.id
       LEFT JOIN sales_items si ON s.id = si.sale_id
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.status != 'cancelled' ${dateFilter}
       GROUP BY s.id, c.name, c.nic, u.username
       ORDER BY s.created_at DESC`,
      params
    );

    if (format === 'excel') {
      return await generateExcelReport(res, result.rows, 'Sales Report');
    } else if (format === 'pdf') {
      return await generatePDFReport(res, result.rows, 'Sales Report');
    }

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function generatePaymentReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { format = 'json', start_date, end_date, customer_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

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

    if (customer_id) {
      whereClause += ` AND p.customer_id = $${paramIndex}`;
      params.push(customer_id);
      paramIndex++;
    }

    const result = await query(
      `SELECT 
        p.*, c.name as customer_name, c.nic, 
        i.invoice_number, i.total_amount as invoice_total,
        u.username as recorded_by_user
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN users u ON p.recorded_by = u.id
       ${whereClause}
       ORDER BY p.payment_date DESC`,
      params
    );

    if (format === 'excel') {
      return await generateExcelReport(res, result.rows, 'Payment Report');
    } else if (format === 'pdf') {
      return await generatePDFReport(res, result.rows, 'Payment Report');
    }

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateCustomerReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { format = 'json', risk_flag } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (risk_flag) {
      whereClause += ' AND c.risk_flag = $1';
      params.push(risk_flag);
    }

    const result = await query(
      `SELECT 
        c.*,
        ce.employment_type, ce.company_name, ce.monthly_salary,
        COUNT(DISTINCT s.id) as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue,
        COALESCE(SUM(i.remaining_balance), 0) as outstanding_balance
       FROM customers c
       LEFT JOIN customer_employment ce ON c.id = ce.customer_id
       LEFT JOIN sales s ON c.id = s.customer_id
       LEFT JOIN invoices i ON c.id = i.customer_id AND i.status != 'paid'
       ${whereClause}
       GROUP BY c.id, ce.employment_type, ce.company_name, ce.monthly_salary
       ORDER BY c.created_at DESC`,
      params
    );

    if (format === 'excel') {
      return await generateExcelReport(res, result.rows, 'Customer Report');
    } else if (format === 'pdf') {
      return await generatePDFReport(res, result.rows, 'Customer Report');
    }

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateOverdueReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { format = 'json' } = req.query;

    const result = await query(
      `SELECT 
        i.*, c.name as customer_name, c.nic, c.mobile_primary, c.risk_flag,
        EXTRACT(DAY FROM (CURRENT_DATE - i.due_date)) as days_overdue
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.status IN ('pending', 'partial', 'overdue')
       AND i.due_date < CURRENT_DATE
       ORDER BY i.remaining_balance DESC, days_overdue DESC`
    );

    if (format === 'excel') {
      return await generateExcelReport(res, result.rows, 'Overdue Report');
    } else if (format === 'pdf') {
      return await generatePDFReport(res, result.rows, 'Overdue Report');
    }

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function generateExcelReport(res: Response, data: any[], title: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title);

  if (data.length === 0) {
    throw new AppError('No data available for report', 404);
  }

  // Add headers
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Add data
  data.forEach((row) => {
    worksheet.addRow(Object.values(row));
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const length = cell.value ? cell.value.toString().length : 10;
      if (length > maxLength) {
        maxLength = length;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

async function generatePDFReport(res: Response, data: any[], title: string) {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);

  doc.pipe(res);

  // Title
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  if (data.length === 0) {
    doc.fontSize(12).text('No data available', { align: 'center' });
  } else {
    // Add summary
    doc.fontSize(12).text(`Total Records: ${data.length}`, { align: 'left' });
    doc.moveDown();

    // Add data (simplified for PDF)
    data.forEach((row, index) => {
      doc.fontSize(10).text(`Record ${index + 1}:`, { underline: true });
      Object.entries(row).slice(0, 10).forEach(([key, value]) => {
        doc.fontSize(8).text(`${key}: ${value}`);
      });
      doc.moveDown();
      
      if (doc.y > 700) {
        doc.addPage();
      }
    });
  }

  doc.end();
}
