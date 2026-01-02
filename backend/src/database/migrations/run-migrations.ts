import { getClient } from '../db';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const client = await getClient();

  try {
    logger.info('Running database migrations...');

    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);

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
