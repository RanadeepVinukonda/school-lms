import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function applySchema() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not found');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    const schemaPath = path.resolve(__dirname, '../../supabase/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying schema.sql...');
    await client.query(sql);
    
    // Attempt to drop the old table just in case
    console.log('Dropping legacy firestore_docs...');
    await client.query('DROP TABLE IF EXISTS firestore_docs;');

    console.log('Schema applied successfully.');
  } catch (error) {
    console.error('Failed to apply schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();
