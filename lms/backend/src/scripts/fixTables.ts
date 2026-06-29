import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fixTables() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not found');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    console.log('Creating nosql_docs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS nosql_docs (
        collection TEXT NOT NULL,
        doc_id TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (collection, doc_id)
      );
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nosql_docs_collection ON nosql_docs(collection);`);

    console.log('Dropping legacy firestore_docs...');
    await client.query('DROP TABLE IF EXISTS firestore_docs;');

    console.log('Tables fixed successfully.');
  } catch (error) {
    console.error('Failed to fix tables:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixTables();
