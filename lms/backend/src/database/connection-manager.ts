import { Pool } from 'pg';
import { logger } from '../utils/logger';

let _pool: Pool | null = null;

export function getConnectionPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  const poolMax = parseInt(process.env.DATABASE_POOL_MAX || '20', 10);
  _pool = new Pool({ connectionString: url, max: poolMax, idleTimeoutMillis: 30000 });
  _pool.on('error', (err) => logger.error('Unexpected pool error', { error: err }));
  return _pool;
}

export async function closeConnectionPool(): Promise<void> {
  if (_pool) {
    const p = _pool;
    _pool = null;
    await p.end();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const pool = getConnectionPool();
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
