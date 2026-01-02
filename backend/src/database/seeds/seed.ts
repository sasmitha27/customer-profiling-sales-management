import { query } from '../db';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('adminpass', 10);
    await query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', 'admin@example.com', adminPassword, 'admin']
    );
    logger.info('Admin user created');

    // Create sample users
    const salesPassword = await bcrypt.hash('sales123', 10);
    await query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES 
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12)
       ON CONFLICT (username) DO NOTHING`,
      [
        'sales1', 'sales1@example.com', salesPassword, 'sales_officer',
        'accountant1', 'accountant1@example.com', salesPassword, 'accountant',
        'manager1', 'manager1@example.com', salesPassword, 'manager',
      ]
    );
    logger.info('Sample users created');

    // Create sample products
    await query(
      `INSERT INTO products (name, sku, category, cost_price, selling_price, stock_quantity, is_fast_moving)
       VALUES 
        ('Dining Table Set', 'DT-001', 'Dining', 25000, 35000, 15, true),
        ('King Size Bed', 'BED-001', 'Bedroom', 45000, 65000, 8, true),
        ('Office Chair', 'CH-001', 'Office', 8000, 12000, 25, true),
        ('Wardrobe', 'WD-001', 'Bedroom', 35000, 50000, 10, false),
        ('Coffee Table', 'CT-001', 'Living Room', 6000, 9000, 20, false),
        ('Sofa Set', 'SF-001', 'Living Room', 55000, 85000, 6, true),
        ('Study Table', 'ST-001', 'Office', 12000, 18000, 12, false),
        ('Bookshelf', 'BS-001', 'Office', 15000, 22000, 10, false),
        ('TV Stand', 'TV-001', 'Living Room', 8000, 13000, 15, false),
        ('Recliner Chair', 'RC-001', 'Living Room', 18000, 28000, 8, false)
       ON CONFLICT (sku) DO NOTHING`
    );
    logger.info('Sample products created');

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

// Run seed if executed directly
if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed:', error);
      process.exit(1);
    });
}

export default seed;
