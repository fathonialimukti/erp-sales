import { execSync } from 'child_process';
import { logger } from './logger.js';

export function checkMigrations(): void {
  try {
    const output = execSync('bun prisma migrate status', { encoding: 'utf-8' });
    if (output.includes('No migration') || output.includes('up to date')) {
      logger.info('Database migrations are up to date');
    } else {
      logger.warn('Database migration status check', { output: output.slice(0, 200) });
    }
  } catch (error) {
    logger.warn('Could not verify migration status', { error: String(error) });
  }
}
