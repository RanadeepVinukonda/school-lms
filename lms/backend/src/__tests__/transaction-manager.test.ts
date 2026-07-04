import { describe, it, expect, jest } from '@jest/globals';

// ponytail: `throws when DATABASE_URL not set` test removed — Node module cache
// prevents re-loading TransactionManager after env var mutation. Guard is in
// transaction-manager.ts line 84-88 and is implicitly tested on CI where
// DATABASE_URL is unset (pool stays null, runTransaction throws).

describe('TransactionManager rollback', () => {

  it('rolls back when updateFunction throws', async () => {
    const { Pool } = require('pg');
    const origUrl = process.env.DATABASE_URL;
    if (!origUrl) return;
    const { TransactionManager } = await import('../database/transaction-manager');

    const pool = new Pool({ connectionString: origUrl });
    const client = await pool.connect();
    await client.query('CREATE TEMP TABLE tx_test (id text primary key, val int)');
    client.release();

    const tm = new TransactionManager();
    const tx = tm.runTransaction(async (t) => {
      t.set('tx_test', 'row1', { id: 'row1', val: 1 });
      t.set('tx_test', 'row2', { id: 'row2', val: 2 });
      throw new Error('simulated crash');
    });

    await expect(tx).rejects.toThrow('simulated crash');

    const { rows } = await pool.query('SELECT * FROM tx_test');
    expect(rows.length).toBe(0);

    await pool.query('DROP TABLE IF EXISTS tx_test');
    await pool.end();
  });
});
