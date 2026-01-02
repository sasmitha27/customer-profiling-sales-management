import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { query } from '../database/db';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  body: any;
  params: any;
  query: any;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required. Please provide a valid token.', 401);
    }

    if (!process.env.JWT_SECRET) {
      throw new AppError('Server configuration error', 500);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Verify user still exists and is active
    query('SELECT id, username, email, role, is_active FROM users WHERE id = $1', [decoded.id])
      .then((result) => {
        if (result.rows.length === 0 || !result.rows[0].is_active) {
          throw new AppError('User account is inactive or deleted', 401);
        }
        
        req.user = {
          id: result.rows[0].id,
          username: result.rows[0].username,
          email: result.rows[0].email,
          role: result.rows[0].role,
        };
        next();
      })
      .catch((error) => {
        next(new AppError('Authentication failed', 401));
      });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token has expired. Please login again.', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token. Please login again.', 401));
    } else {
      next(error);
    }
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      // Audit unauthorized access attempts
      query(
        'INSERT INTO audit_logs (user_id, action, entity_type, ip_address) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'system', req.ip]
      ).catch(() => {}); // Don't fail if audit fails

      return next(new AppError(`Insufficient permissions. Required roles: ${roles.join(', ')}`, 403));
    }

    next();
  };
}

/**
 * Rate limiting for sensitive operations
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const key = `${req.user.id}:${req.route?.path || req.path}`;
    const now = Date.now();
    const userLimit = rateLimitMap.get(key);

    if (!userLimit || userLimit.resetTime < now) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return next(new AppError('Too many requests. Please try again later.', 429));
    }

    userLimit.count++;
    next();
  };
}

/**
 * Validate request IP and log for security
 */
export function logRequest(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user) {
    const sensitiveRoutes = ['/api/customers', '/api/payments', '/api/sales', '/api/users'];
    const isSensitive = sensitiveRoutes.some(route => req.path.startsWith(route));

    if (isSensitive && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      query(
        'INSERT INTO audit_logs (user_id, action, entity_type, ip_address) VALUES ($1, $2, $3, $4)',
        [req.user.id, `${req.method}_${req.path}`, 'api_access', req.ip]
      ).catch(() => {}); // Non-blocking
    }
  }
  next();
}
