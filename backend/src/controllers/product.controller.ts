import { Response, NextFunction } from 'express';
import { query, getClient } from '../database/db';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { clearCachePattern } from '../config/redis';

export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, sku, category, description, cost_price, selling_price, stock_quantity } = req.body;

    if (!name || !sku || !cost_price || !selling_price) {
      throw new AppError('Missing required fields', 400);
    }

    const result = await query(
      `INSERT INTO products (name, sku, category, description, cost_price, selling_price, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, sku, category, description, cost_price, selling_price, stock_quantity || 0]
    );

    await clearCachePattern('products:*');

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function getProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, search, category, is_fast_moving } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE is_active = TRUE';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (is_fast_moving !== undefined) {
      whereClause += ` AND is_fast_moving = $${paramIndex}`;
      params.push(is_fast_moving === 'true');
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM products ${whereClause}`, params);

    const result = await query(
      `SELECT * FROM products ${whereClause}
       ORDER BY created_at DESC
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

export async function getProductById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'sku', 'category', 'description', 'cost_price', 'selling_price', 'stock_quantity', 'is_fast_moving', 'is_active'];

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
    const result = await query(
      `UPDATE products SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    await clearCachePattern('products:*');

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query('UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    await clearCachePattern('products:*');

    res.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}
