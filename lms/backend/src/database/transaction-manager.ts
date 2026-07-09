import { PoolClient } from 'pg';
import { getConnectionPool } from './connection-manager';
import { logger } from '../utils/logger';

// ── Types ──

/** Raw SQL query interface scoped to a transaction. */
export interface SqlQuery {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

/**
 * A transaction that supports get/set/update/delete via raw SQL over the same
 * pg.PoolClient connection. This guarantees ACID semantics.
 *
 * IMPORTANT: Do NOT use supabase.from() calls inside a transaction block.
 * Supabase uses a separate HTTP connection to PostgREST and bypasses the
 * transaction boundary. Use `tx.db().query(...)` or `tx.set(...)` instead.
 */
export interface Transaction {
  get(collection: string, docId: string): Promise<unknown>;
  set(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  update(collection: string, docId: string, data: Record<string, unknown>): Promise<void>;
  delete(collection: string, docId: string): Promise<void>;
  /** Raw SQL query interface running inside this transaction (same connection). */
  db(): SqlQuery;
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

  constructor(private client: PoolClient) {}

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

// ── TransactionManager ──

export class TransactionManager {
  /**
   * Run operations inside a real ACID transaction via pg PoolClient.
   *
   * REQUIREMENTS:
   * - DATABASE_URL must be set in environment.
   * - All writes MUST go through `tx.db().query()`, `tx.set()`, `tx.update()`, or `tx.delete()`.
   * - Do NOT use `supabase.from().insert()` inside the callback — it bypasses the transaction.
   *
   * @throws Error if DATABASE_URL is not configured.
   */
  async runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    const pool = getConnectionPool();
    const client = await pool.connect();
    try {
      const pgTx = new PgTransaction(client);
      const r = await updateFunction(pgTx);
      await pgTx.execute();
      return r;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('Transaction rolled back', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      client.release();
    }
  }
}
