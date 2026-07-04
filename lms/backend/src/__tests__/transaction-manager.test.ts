import { describe, it, expect, jest } from '@jest/globals';

describe('TransactionManager rollback', () => {
  it('throws when DATABASE_URL not set', async () => {
    const orig = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const { TransactionManager } = await import('../database/transaction-manager');
    const tm = new TransactionManager();
    await expect(tm.runTransaction(async () => {})).rejects.toThrow('DATABASE_URL');
    if (orig) process.env.DATABASE_URL = orig;
  });

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
