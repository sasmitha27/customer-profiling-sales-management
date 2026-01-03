import { getClient } from '../db';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const client = await getClient();

  try {
    logger.info('Running database migrations...');

    // Step 1: Run base schema
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    logger.info('Base schema applied successfully');

    // Step 2: Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Step 3: Run all migration files in order
    const migrationsDir = __dirname;
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order (001, 002, 003, etc.)

    for (const file of migrationFiles) {
      // Check if migration has already been applied
      const checkResult = await client.query(
        'SELECT migration_name FROM schema_migrations WHERE migration_name = $1',
        [file]
      );

      if (checkResult.rows.length > 0) {
        logger.info(`Migration ${file} already applied, skipping...`);
        continue;
      }

      // Run the migration
      logger.info(`Applying migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await client.query(migrationSQL);
        
        // Record successful migration
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
          [file]
        );
        
        logger.info(`Migration ${file} applied successfully`);
      } catch (error) {
        logger.error(`Error applying migration ${file}:`, error);
        throw error;
      }
    }

    logger.info('Database migrations completed successfully!');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default runMigrations;
