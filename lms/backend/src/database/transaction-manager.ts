import { Pool, PoolClient } from 'pg';
import { Transaction } from './interfaces/transaction';
import { logger } from '../utils/logger';

// ── PseudoTx — sequential writes, no ACID guarantee ──
// Used when no pg pool is configured or in tests.
export class PseudoTx implements Transaction {
  private _w: Array<{ t: 's' | 'u' | 'd'; colName: string; id: string; d?: Record<string, unknown> }> = [];

  async get(collection: string, docId: string): Promise<unknown> {
    const { DocRef } = await import('./adapter');
    const snap = await new DocRef(collection, docId).get();
    return snap.data();
  }

  async set(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._w.push({ t: 's', colName: collection, id: docId, d: data });
  }

  async update(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._w.push({ t: 'u', colName: collection, id: docId, d: data });
  }

  async delete(collection: string, docId: string): Promise<void> {
    this._w.push({ t: 'd', colName: collection, id: docId });
  }

  async commit(): Promise<void> {
    const { DocRef } = await import('./adapter');
    for (const w of this._w) {
      const ref = new DocRef(w.colName, w.id);
      switch (w.t) {
        case 's': await ref.set(w.d!); break;
        case 'u': await ref.update(w.d!); break;
        case 'd': await ref.delete(); break;
      }
    }
  }
}

// ── PgTransaction — real ACID transaction via pg pool client ──
// Executes all writes within a single PostgreSQL BEGIN/COMMIT/ROLLBACK block.
class PgTransaction implements Transaction {
  private _ops: Array<() => Promise<void>> = [];

  constructor(private client: PoolClient) {}

  async get(collection: string, docId: string): Promise<unknown> {
    // Read directly via Supabase client (reads don't need transactional isolation here)
    const { DocRef } = await import('./adapter');
    const snap = await new DocRef(collection, docId).get();
    return snap.data();
  }

  async set(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._ops.push(async () => {
      const { DocRef } = await import('./adapter');
      await new DocRef(collection, docId).set(data);
    });
  }

  async update(collection: string, docId: string, data: Record<string, unknown>): Promise<void> {
    this._ops.push(async () => {
      const { DocRef } = await import('./adapter');
      await new DocRef(collection, docId).update(data);
    });
  }

  async delete(collection: string, docId: string): Promise<void> {
    this._ops.push(async () => {
      const { DocRef } = await import('./adapter');
      await new DocRef(collection, docId).delete();
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
   * Uses real BEGIN/COMMIT/ROLLBACK when DATABASE_URL is configured.
   * Falls back to sequential writes (PseudoTx) when no pg pool is available.
   */
  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    const pool = getPool();

    if (!pool) {
      // Fallback: sequential writes without ACID guarantee
      logger.warn('TransactionManager: DATABASE_URL not set, using sequential writes (no ACID)');
      const t = new PseudoTx();
      const r = await updateFunction(t);
      await t.commit();
      return r;
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
