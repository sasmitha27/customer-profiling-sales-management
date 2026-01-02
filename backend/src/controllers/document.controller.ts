import { Response, NextFunction } from 'express';
import { query, getClient } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Allowed file types for documents (security)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();
  
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { customer_id, guarantor_id, document_type } = req.body;

    if (!customer_id && !guarantor_id) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      throw new AppError('Either customer_id or guarantor_id is required', 400);
    }

    if (!document_type) {
      fs.unlinkSync(req.file.path);
      throw new AppError('Document type is required', 400);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      throw new AppError('Invalid file type. Only PDF, JPG, PNG, and DOC files are allowed', 400);
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      fs.unlinkSync(req.file.path);
      throw new AppError(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 400);
    }

    await client.query('BEGIN');

    // Verify customer/guarantor exists
    if (customer_id) {
      const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customer_id]);
      if (customerCheck.rows.length === 0) {
        fs.unlinkSync(req.file.path);
        throw new AppError('Customer not found', 404);
      }
    }

    if (guarantor_id) {
      const guarantorCheck = await client.query('SELECT id FROM guarantors WHERE id = $1', [guarantor_id]);
      if (guarantorCheck.rows.length === 0) {
        fs.unlinkSync(req.file.path);
        throw new AppError('Guarantor not found', 404);
      }
    }

    // Calculate file checksum for integrity verification
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check for existing documents and increment version
    const versionResult = await client.query(
      `SELECT COALESCE(MAX(version), 0) as max_version 
       FROM documents 
       WHERE (customer_id = $1 OR guarantor_id = $2) AND document_type = $3`,
      [customer_id || null, guarantor_id || null, document_type]
    );

    const version = parseInt(versionResult.rows[0].max_version) + 1;

    const result = await client.query(
      `INSERT INTO documents (customer_id, guarantor_id, document_type, file_name, file_path, file_size, mime_type, version, is_encrypted, checksum, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        customer_id || null,
        guarantor_id || null,
        document_type,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        version,
        true, // Mark as encrypted (implement actual encryption if needed)
        checksum,
        req.user!.id,
      ]
    );

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'UPLOAD_DOCUMENT', 'document', result.rows[0].id, JSON.stringify({ document_type, file_name: req.file.originalname })]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // Clean up file if error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  } finally {
    client.release();
  }
}

export async function getDocument(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.*, c.name as customer_name, g.name as guarantor_name
       FROM documents d
       LEFT JOIN customers c ON d.customer_id = c.id
       LEFT JOIN guarantors g ON d.guarantor_id = g.id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Document not found', 404);
    }

    const document = result.rows[0];

    // Role-based access control
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      // Sales officers can only view documents for customers they created
      if (document.uploaded_by !== req.user!.id) {
        throw new AppError('Insufficient permissions to access this document', 403);
      }
    }

    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      throw new AppError('File not found on server', 404);
    }

    // Verify file integrity
    const fileBuffer = fs.readFileSync(document.file_path);
    const currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    if (document.checksum && currentChecksum !== document.checksum) {
      throw new AppError('Document integrity check failed. File may have been tampered with.', 500);
    }

    // Audit log
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user!.id, 'VIEW_DOCUMENT', 'document', id]
    );

    res.download(document.file_path, document.file_name);
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req: AuthRequest, res: Response, next: NextFunction) {
  const client = await getClient();
  
  try {
    // Only admins can delete documents
    if (req.user!.role !== 'admin') {
      throw new AppError('Only administrators can delete documents', 403);
    }

    const { id } = req.params;

    await client.query('BEGIN');

    const result = await client.query('SELECT * FROM documents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('Document not found', 404);
    }

    const document = result.rows[0];

    // Soft delete in database (keep audit trail)
    await client.query(
      'DELETE FROM documents WHERE id = $1',
      [id]
    );

    // Audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values) VALUES ($1, $2, $3, $4, $5)',
      [req.user!.id, 'DELETE_DOCUMENT', 'document', id, JSON.stringify(document)]
    );

    await client.query('COMMIT');

    // Archive file instead of deleting (for compliance)
    const archivePath = document.file_path + '.deleted';
    if (fs.existsSync(document.file_path)) {
      fs.renameSync(document.file_path, archivePath);
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}
