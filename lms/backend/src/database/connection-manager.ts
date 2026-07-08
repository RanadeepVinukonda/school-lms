import { Pool } from 'pg';

let _pool: Pool | null = null;

export function getConnectionPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not configured');
  _pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30000 });
  _pool.on('error', (err) => console.error('Unexpected pool error', err));
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
