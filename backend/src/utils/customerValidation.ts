import { PoolClient } from 'pg';
import { AppError } from '../middleware/errorHandler';

/**
 * Customer validation utilities for data integrity and duplicate prevention
 */

// Validation patterns
const NIC_PATTERN = /^[0-9]{9}[VvXx]$|^[0-9]{12}$/;
const MOBILE_PATTERN = /^(?:\+94|0)?[0-9]{9,10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CustomerValidationData {
  name?: string;
  nic?: string;
  dob?: string | Date;
  gender?: string;
  mobile_primary?: string;
  mobile_secondary?: string;
  email?: string;
  permanent_address?: string;
}

export interface GuarantorData {
  name: string;
  nic: string;
  mobile: string;
  address: string;
  dob?: string | Date;
  gender?: string;
  email?: string;
  workplace?: string;
  relationship?: string;
}

/**
 * Normalize mobile number to a standard format
 * Converts +94XXXXXXXXX or 0XXXXXXXXX to standard format
 */
export function normalizeMobile(mobile: string): string {
  const cleaned = mobile.replace(/\s+/g, '').trim();
  
  if (cleaned.startsWith('+94')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+94' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    return '+94' + cleaned;
  }
  
  return cleaned;
}

/**
 * Normalize NIC to uppercase
 */
export function normalizeNIC(nic: string): string {
  return nic.trim().toUpperCase();
}

/**
 * Validate NIC format (Sri Lankan NIC: 9 digits + V/X or 12 digits)
 */
export function validateNIC(nic: string): boolean {
  return NIC_PATTERN.test(nic);
}

/**
 * Validate mobile number format
 */
export function validateMobile(mobile: string): boolean {
  return MOBILE_PATTERN.test(mobile);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/**
 * Validate date of birth
 * - Must be at least 18 years old
 * - Cannot be in the future
 */
export function validateDOB(dob: string | Date): { valid: boolean; error?: string; date?: Date } {
  const dobDate = new Date(dob);
  
  if (isNaN(dobDate.getTime())) {
    return { valid: false, error: 'Invalid date of birth format' };
  }
  
  const today = new Date();
  
  if (dobDate > today) {
    return { valid: false, error: 'Date of birth cannot be in the future' };
  }
  
  const age = (today.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  if (age < 18) {
    return { valid: false, error: 'Customer must be at least 18 years old' };
  }
  
  return { valid: true, date: dobDate };
}

/**
 * Validate required customer fields
 */
export function validateRequiredFields(data: CustomerValidationData): void {
  const required = ['name', 'nic', 'dob', 'gender', 'mobile_primary', 'permanent_address'];
  const missing: string[] = [];
  
  for (const field of required) {
    const value = data[field as keyof CustomerValidationData];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required fields: ${missing.join(', ')}`,
      400
    );
  }
}

/**
 * Validate customer data before save
 */
export function validateCustomerData(data: CustomerValidationData): {
  validatedData: CustomerValidationData;
  normalizedNIC: string;
  normalizedMobile: string;
} {
  // Validate required fields
  validateRequiredFields(data);
  
  // Validate and normalize NIC
  const nicClean = normalizeNIC(data.nic!);
  if (!validateNIC(nicClean)) {
    throw new AppError(
      'Invalid NIC format. Use 9 digits + V/X or 12 digits (e.g., 123456789V or 200012345678)',
      400
    );
  }
  
  // Validate and normalize mobile
  const mobilePrimary = normalizeMobile(data.mobile_primary!);
  if (!validateMobile(data.mobile_primary!)) {
    throw new AppError(
      'Invalid primary mobile format. Use +94XXXXXXXXX or 0XXXXXXXXX',
      400
    );
  }
  
  // Validate secondary mobile if provided
  if (data.mobile_secondary && data.mobile_secondary.trim() !== '') {
    if (!validateMobile(data.mobile_secondary)) {
      throw new AppError(
        'Invalid secondary mobile format. Use +94XXXXXXXXX or 0XXXXXXXXX',
        400
      );
    }
  }
  
  // Validate email if provided
  if (data.email && data.email.trim() !== '') {
    if (!validateEmail(data.email)) {
      throw new AppError('Invalid email format', 400);
    }
  }
  
  // Validate DOB
  const dobValidation = validateDOB(data.dob!);
  if (!dobValidation.valid) {
    throw new AppError(dobValidation.error!, 400);
  }
  
  // Validate gender
  const validGenders = ['male', 'female', 'other'];
  if (!validGenders.includes(data.gender!.toLowerCase())) {
    throw new AppError('Gender must be one of: male, female, other', 400);
  }
  
  return {
    validatedData: {
      ...data,
      nic: nicClean,
      mobile_primary: mobilePrimary,
      gender: data.gender!.toLowerCase(),
    },
    normalizedNIC: nicClean,
    normalizedMobile: mobilePrimary,
  };
}

/**
 * Check for duplicate customer by NIC or mobile
 * Returns the existing customer if found, null otherwise
 */
export async function checkDuplicateCustomer(
  client: PoolClient,
  nic: string,
  mobile: string,
  excludeId?: number
): Promise<{ isDuplicate: boolean; duplicateField?: string; existingCustomer?: any }> {
  const nicNormalized = normalizeNIC(nic);
  const mobileNormalized = normalizeMobile(mobile);
  
  let query = `
    SELECT id, customer_number, name, nic, mobile_primary, email
    FROM customers
    WHERE (UPPER(nic) = UPPER($1) OR LOWER(mobile_primary) = LOWER($2))
  `;
  
  const params: any[] = [nicNormalized, mobileNormalized];
  
  if (excludeId) {
    query += ' AND id != $3';
    params.push(excludeId);
  }
  
  const result = await client.query(query, params);
  
  if (result.rows.length > 0) {
    const existing = result.rows[0];
    let duplicateField = 'unknown';
    
    if (existing.nic.toUpperCase() === nicNormalized.toUpperCase()) {
      duplicateField = 'NIC';
    } else if (existing.mobile_primary.toLowerCase() === mobileNormalized.toLowerCase()) {
      duplicateField = 'mobile number';
    }
    
    return {
      isDuplicate: true,
      duplicateField,
      existingCustomer: existing,
    };
  }
  
  return { isDuplicate: false };
}

/**
 * Find existing customer by NIC or mobile (for guarantor reuse)
 * Returns customer ID if found, null otherwise
 */
export async function findCustomerByNICOrMobile(
  client: PoolClient,
  nic: string,
  mobile: string
): Promise<{ found: boolean; customer?: any }> {
  const nicNormalized = normalizeNIC(nic);
  const mobileNormalized = normalizeMobile(mobile);
  
  const result = await client.query(
    `SELECT id, customer_number, name, nic, mobile_primary, permanent_address, is_guarantor
     FROM customers
     WHERE UPPER(nic) = UPPER($1) OR LOWER(mobile_primary) = LOWER($2)
     LIMIT 1`,
    [nicNormalized, mobileNormalized]
  );
  
  if (result.rows.length > 0) {
    return {
      found: true,
      customer: result.rows[0],
    };
  }
  
  return { found: false };
}

/**
 * Check if a guarantor relationship would create a circular dependency
 */
export async function checkCircularGuarantor(
  client: PoolClient,
  customerId: number,
  guarantorId: number
): Promise<{ isCircular: boolean; circularPath?: string[] }> {
  // Self-reference check
  if (customerId === guarantorId) {
    return {
      isCircular: true,
      circularPath: [customerId.toString(), guarantorId.toString()],
    };
  }
  
  // Check if guarantorId already has customerId as a guarantor (direct circular)
  const directCircular = await client.query(
    `SELECT 1 FROM customer_relationships
     WHERE customer_id = $1 AND guarantor_id = $2`,
    [guarantorId, customerId]
  );
  
  if (directCircular.rows.length > 0) {
    return {
      isCircular: true,
      circularPath: [customerId.toString(), guarantorId.toString(), customerId.toString()],
    };
  }
  
  // Check for indirect circular relationships using recursive query
  const result = await client.query(
    `WITH RECURSIVE guarantor_chain AS (
      -- Start with the proposed guarantor
      SELECT 
        guarantor_id as customer_id,
        ARRAY[guarantor_id] as path,
        1 as depth
      FROM customer_relationships
      WHERE customer_id = $1
      
      UNION ALL
      
      -- Follow the chain
      SELECT 
        cr.guarantor_id,
        gc.path || cr.guarantor_id,
        gc.depth + 1
      FROM customer_relationships cr
      INNER JOIN guarantor_chain gc ON cr.customer_id = gc.customer_id
      WHERE NOT (cr.guarantor_id = ANY(gc.path))
        AND gc.depth < 10
    )
    SELECT path
    FROM guarantor_chain
    WHERE customer_id = $2
    LIMIT 1`,
    [guarantorId, customerId]
  );
  
  if (result.rows.length > 0) {
    return {
      isCircular: true,
      circularPath: result.rows[0].path.map((id: number) => id.toString()),
    };
  }
  
  return { isCircular: false };
}

/**
 * Validate guarantor data
 */
export function validateGuarantorData(data: GuarantorData): void {
  const required = ['name', 'nic', 'mobile', 'address'];
  const missing: string[] = [];
  
  for (const field of required) {
    const value = data[field as keyof GuarantorData];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required guarantor fields: ${missing.join(', ')}`,
      400
    );
  }
  
  // Validate NIC
  const nicClean = normalizeNIC(data.nic);
  if (!validateNIC(nicClean)) {
    throw new AppError(
      'Invalid guarantor NIC format. Use 9 digits + V/X or 12 digits',
      400
    );
  }
  
  // Validate mobile
  if (!validateMobile(data.mobile)) {
    throw new AppError(
      'Invalid guarantor mobile format. Use +94XXXXXXXXX or 0XXXXXXXXX',
      400
    );
  }
  
  // Validate email if provided
  if (data.email && data.email.trim() !== '') {
    if (!validateEmail(data.email)) {
      throw new AppError('Invalid guarantor email format', 400);
    }
  }
  
  // Validate DOB if provided
  if (data.dob) {
    const dobValidation = validateDOB(data.dob);
    if (!dobValidation.valid) {
      throw new AppError(`Guarantor: ${dobValidation.error}`, 400);
    }
  }
}

/**
 * Create error response for duplicate customer
 */
export function createDuplicateErrorResponse(
  duplicateField: string,
  existingCustomer: any
): AppError {
  return new AppError(
    `A customer with this ${duplicateField} already exists. ` +
    `Customer: ${existingCustomer.name} (${existingCustomer.customer_number})`,
    409
  );
}

/**
 * Validate employment data
 */
export function validateEmploymentData(employment: any): void {
  if (!employment) return;
  
  const required = ['employment_type', 'company_name', 'monthly_salary'];
  const missing: string[] = [];
  
  for (const field of required) {
    if (!employment[field] || employment[field].toString().trim() === '') {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required employment fields: ${missing.join(', ')}`,
      400
    );
  }
  
  const salary = parseFloat(employment.monthly_salary);
  if (isNaN(salary) || salary <= 0) {
    throw new AppError('Monthly salary must be greater than 0', 400);
  }
  
  if (employment.start_date && employment.start_date.toString().trim() !== '') {
    const startDate = new Date(employment.start_date);
    if (isNaN(startDate.getTime())) {
      throw new AppError('Invalid employment start date format', 400);
    }
    
    const today = new Date();
    if (startDate > today) {
      throw new AppError('Employment start date cannot be in the future', 400);
    }
  }
}
