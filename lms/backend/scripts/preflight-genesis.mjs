import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
async function main() {
  const r = await pool.query(`select proname from pg_proc where proname='crypt'`);
  console.log('pgcrypto crypt() available:', r.rows.length > 0);
  const a = await pool.query(`select email, role from public.users where role ilike '%admin%'`);
  console.log('Admins to preserve:', JSON.stringify(a.rows));
  const v = await pool.query(`select version()`);
  console.log('PG:', v.rows[0].version.split(' on ')[0]);
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1); }).finally(() => pool.end());