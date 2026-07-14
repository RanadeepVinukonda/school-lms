import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(async () => {
  try {
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
    const tables = tablesRes.rows.map(r => r.table_name as string);
    
    for (const table of tables) {
      if (['firestore_docs', 'firestore_docs'].includes(table)) continue;
      const colRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1;", [table]);
      const cols = colRes.rows.map(r => `'${r.column_name}'`);
      console.log(`  ${table}: new Set([${cols.join(',')}]),`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
