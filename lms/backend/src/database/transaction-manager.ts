import { Pool, PoolClient } from 'pg';
import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';

interface Transaction {
  get(collection: string, docId: string): Promise<unknown>;
  set(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  update(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  delete(collection: string, docId: string): Promise<void>;
}

// ── PgTransaction — real ACID transaction via pg pool client ──
// Executes all writes within a single PostgreSQL BEGIN/COMMIT/ROLLBACK block.
class PgTransaction implements Transaction {
  private _ops: Array<() => Promise<void>> = [];

  constructor(private client: PoolClient) {}

  async get(collection: string, docId: string): Promise<unknown> {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Supabase not configured');
    const { data } = await supabase.from(collection).select('*').eq('id', docId).maybeSingle();
    return data || null;
  }

  async set(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._ops.push(async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase not configured');
      await supabase.from(collection).upsert({ id: docId, ...data }).eq('id', docId);
    });
  }

  async update(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._ops.push(async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase not configured');
      await supabase.from(collection).update(data).eq('id', docId);
    });
  }

  async delete(collection: string, docId: string): Promise<void> {
    this._ops.push(async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('Supabase not configured');
      await supabase.from(collection).delete().eq('id', docId);
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
