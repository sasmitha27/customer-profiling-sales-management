import { Response, NextFunction } from 'express';
import { query } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, role, is_active } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(is_active === 'true');
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params);

    const result = await query(
      `SELECT id, username, email, role, is_active, created_at, last_login
       FROM users
       ${whereClause}
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

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { username, email, role, is_active, password } = req.body;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (username) {
      fields.push(`username = $${paramIndex}`);
      values.push(username);
      paramIndex++;
    }

    if (email) {
      fields.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (role) {
      fields.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (is_active !== undefined) {
      fields.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${paramIndex}`);
      values.push(passwordHash);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} 
       RETURNING id, username, email, role, is_active`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (Number(id) === req.user!.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
