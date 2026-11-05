import { getConnectionPool } from '../database/connection-manager';
import { logger } from '../utils/logger';

export async function cleanupIdempotencyKeys(): Promise<void> {
  try {
    const pool = getConnectionPool();
    await pool.query(
      `DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours'`
    );
    logger.debug('Idempotency keys cleaned up');
  } catch (error) {
    logger.error('Idempotency cleanup failed', { error });
  }
}
