import { Pool, PoolClient } from 'pg';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// ── Types ──

/** Raw SQL query interface scoped to a transaction. */
export interface SqlQuery {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface Transaction {
  get(collection: string, docId: string): Promise<unknown>;
  set(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  update(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  delete(collection: string, docId: string): Promise<void>;
  /** Raw SQL query interface running inside this transaction (same connection / scope). */
  db(): SqlQuery;
  /**
   * Supabase client.
   * WARNING: when accessed inside a pg-backed transaction (DATABASE_URL set), writes via
   * this client bypass ACID guarantees — they use a separate HTTP connection to PostgREST.
   * A one-time warning is logged on first access. Use `transaction.db()` for raw SQL
   * within the transaction instead.
   */
  supabase: SupabaseClient;
}

// ── Helpers ──

function serialize(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

// ── PgTransaction — real ACID via pg pool client ──

class PgTransaction implements Transaction {
  private _ops: Array<() => Promise<void>> = [];
  private _supabaseWarned = false;

  constructor(
    private client: PoolClient,
    private _supabaseClient: SupabaseClient | undefined,
  ) {}

  get supabase(): SupabaseClient {
    if (!this._supabaseWarned && this._supabaseClient) {
      this._supabaseWarned = true;
      logger.warn(
        'Transaction.supabase: accessing Supabase client inside a pg transaction bypasses ACID guarantees. Use transaction.db() for raw SQL within the transaction instead.',
      );
    }
    if (!this._supabaseClient) {
      throw new Error(
        'Transaction.supabase: no Supabase client available. Pass a SupabaseClient to the TransactionManager constructor.',
      );
    }
    return this._supabaseClient;
  }

  db(): SqlQuery {
    return {
      query: (text: string, params?: any[]) =>
        this.client.query(text, params) as Promise<{ rows: any[]; rowCount: number | null }>,
    };
  }

  async get(collection: string, docId: string): Promise<unknown> {
    const { rows } = await this.client.query(
      `SELECT * FROM ${collection} WHERE id = $1 LIMIT 1`,
      [docId],
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
        vals,
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
        vals,
      );
    });
  }

  async delete(collection: string, docId: string): Promise<void> {
    this._ops.push(async () => {
      await this.client.query(`DELETE FROM ${collection} WHERE id = $1`, [docId]);
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
      logger.error('Transaction rolled back', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

// ── SupabaseTransaction — no ACID, direct PostgREST HTTP calls ──

class SupabaseTransaction implements Transaction {
  constructor(private _supabase: SupabaseClient) {}

  get supabase(): SupabaseClient {
    return this._supabase;
  }

  db(): SqlQuery {
    throw new Error(
      'Transaction.db() is not available when using SupabaseTransaction. ' +
        'Raw SQL queries require a PostgreSQL connection (set DATABASE_URL). ' +
        'Use transaction.supabase.from() methods instead.',
    );
  }

  async get(collection: string, docId: string): Promise<unknown> {
    const { data, error } = await this._supabase
      .from(collection)
      .select('*')
      .eq('id', docId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async set(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    const { error } = await this._supabase
      .from(collection)
      .upsert({ id: docId, ...(data as any) });
    if (error) throw error;
  }

  async update(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    const entries = Object.entries(data);
    if (entries.length === 0) return;
    const { error } = await this._supabase
      .from(collection)
      .update(data as any)
      .eq('id', docId);
    if (error) throw error;
  }

  async delete(collection: string, docId: string): Promise<void> {
    const { error } = await this._supabase
      .from(collection)
      .delete()
      .eq('id', docId);
    if (error) throw error;
  }
}

// ── Connection pool (singleton) ──

let _pool: Pool | null = null;

function getPool(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _pool = new Pool({ connectionString: url, max: 5 });
  return _pool;
}

// ── TransactionManager ──

export class TransactionManager {
  /**
   * @param supabaseClient Optional Supabase client. Required when DATABASE_URL is not set.
   */
  constructor(private supabaseClient?: SupabaseClient) {}

  /**
   * Run operations inside a transaction-like scope.
   *
   * - **DATABASE_URL set**: real ACID transaction via pg (BEGIN / COMMIT / ROLLBACK).
   *   All `get`/`set`/`update`/`delete` ops use the same PoolClient connection.
   *
   * - **DATABASE_URL not set, SupabaseClient provided**: falls back to Supabase HTTP calls
   *   (PostgREST).  Every operation is an individual HTTP request — **no ACID guarantees**.
   *   Functional for non-critical writes or prototyping.
   *
   * - **Neither available**: throws.
   */
  async runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    const pool = getPool();

    if (pool) {
      const client = await pool.connect();
      try {
        const pgTx = new PgTransaction(client, this.supabaseClient);
        const r = await updateFunction(pgTx);
        await pgTx.execute();
        return r;
      } finally {
        client.release();
      }
    }

    if (this.supabaseClient) {
      const supabaseTx = new SupabaseTransaction(this.supabaseClient);
      return updateFunction(supabaseTx);
    }

    throw new Error(
      'TransactionManager: DATABASE_URL not configured and no Supabase client provided. ' +
        'Set DATABASE_URL or pass a SupabaseClient to the TransactionManager constructor.',
    );
  }
}
