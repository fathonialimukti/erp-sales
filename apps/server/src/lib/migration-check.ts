import { execSync } from 'child_process';
import { logger } from './logger.js';

export function checkMigrations(): void {
  try {
    const output = execSync('npx prisma migrate status --json', { encoding: 'utf-8' });
    const status = JSON.parse(output);
    if (status.pendingMigrations && status.pendingMigrations.length > 0) {
      logger.warn('Database has pending migrations', {
        pending: status.pendingMigrations.length
      });
    }
  } catch (error) {
    logger.warn('Could not verify migration status', { error: String(error) });
  }
}
