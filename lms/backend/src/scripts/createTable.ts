import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  client.query(`
    CREATE TABLE IF NOT EXISTS firestore_docs (
      collection TEXT NOT NULL, 
      doc_id TEXT NOT NULL, 
      data JSONB NOT NULL DEFAULT '{}', 
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), 
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), 
      PRIMARY KEY (collection, doc_id)
    ); 
    CREATE INDEX IF NOT EXISTS idx_firestore_docs_collection ON firestore_docs(collection);
  `).then(() => {
    console.log('firestore_docs created successfully');
    
    // Also notify PostgREST schema cache to reload (fixes the error)
    return client.query('NOTIFY pgrst, \'reload schema\'');
  }).then(() => {
    console.log('Schema cache reloaded');
    client.end();
    process.exit(0);
  }).catch(e => {
    console.error(e);
    client.end();
    process.exit(1);
  });
});
