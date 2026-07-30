import { Pool } from 'pg';
import { EventEmitter } from 'events';

let _pool: Pool | null = null;

export function getConnectionPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  const poolMax = parseInt(process.env.DATABASE_POOL_MAX || '20', 10);
  _pool = new Pool({ connectionString: url, min: 2, max: poolMax, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, allowExitOnIdle: true });
  (_pool as Pool & EventEmitter).on('error', () => {});
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
