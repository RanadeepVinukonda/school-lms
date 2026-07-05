import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

interface Transaction {
  get(collection: string, docId: string): Promise<unknown>;
  set(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  update(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  delete(collection: string, docId: string): Promise<void>;
}

function serialize(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

// ── PgTransaction — real ACID transaction via pg pool client ──
// All queries use the same pg client connection inside BEGIN/COMMIT/ROLLBACK.
class PgTransaction implements Transaction {
  private _ops: Array<() => Promise<void>> = [];

  constructor(private client: PoolClient) {}

  async get(collection: string, docId: string): Promise<unknown> {
    const { rows } = await this.client.query(
      `SELECT * FROM ${collection} WHERE id = $1 LIMIT 1`,
      [docId]
    );
    return rows[0] || null;
  }

  async set(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._ops.push(async () => {
      const entries = Object.entries(data);
      const keys = ['id', ...entries.map(([k]) => k)];
      const vals = [docId, ...entries.map(([, v]) => serialize(v))];
      const ph = keys.map((_, i) => `$${i + 1}`);
      const updates = entries.map(([k], i) => `${k} = $${i + 2}`);
      await this.client.query(
        `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${ph.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`,
        vals
      );
    });
  }

  async update(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._ops.push(async () => {
      const entries = Object.entries(data);
      if (entries.length === 0) return;
      const sets = entries.map(([k], i) => `${k} = $${i + 1}`);
      const vals = [...entries.map(([, v]) => serialize(v)), docId];
      await this.client.query(
        `UPDATE ${collection} SET ${sets.join(', ')} WHERE id = $${entries.length + 1}`,
        vals
      );
    });
  }

  async delete(collection: string, docId: string): Promise<void> {
    this._ops.push(async () => {
      await this.client.query(
        `DELETE FROM ${collection} WHERE id = $1`,
        [docId]
      );
    });
  }

  async execute(): Promise<void> {
    await this.client.query('BEGIN');
    try {
      for (const op of this._ops) {
        await op();
      }
      await this.client.query('COMMIT');
    } catch (err) {
      await this.client.query('ROLLBACK');
      logger.error('Transaction rolled back', { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }
}

// ── TransactionManager ──
let _pool: Pool | null = null;

function getPool(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _pool = new Pool({ connectionString: url, max: 5 });
  return _pool;
}

export class TransactionManager {
  /**
   * Runs a set of database operations within a PostgreSQL transaction.
   * Uses real BEGIN/COMMIT/ROLLBACK. Throws if DATABASE_URL is not set.
   */
  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    const pool = getPool();

    if (!pool) {
      throw new Error(
        'TransactionManager: DATABASE_URL not configured. Set DATABASE_URL in your environment to use real PostgreSQL transactions.'
      );
    }

    const client = await pool.connect();
    try {
      const pgTx = new PgTransaction(client);
      const r = await updateFunction(pgTx);
      await pgTx.execute();
      return r;
    } finally {
      client.release();
    }
  }
}
