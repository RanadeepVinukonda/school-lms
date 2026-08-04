import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const get = async (email) => (await c.query(`SELECT * FROM auth.users WHERE email=$1`, [email])).rows[0];
const a = await get('tanvi.choudhary1@genesis.edu');
const b = await get('sneha.reddy@genesis.edu');
for (const k of Object.keys(a)) {
  const av = a[k] === null ? 'NULL' : typeof a[k] === 'object' ? JSON.stringify(a[k]) : String(a[k]);
  const bv = b[k] === null ? 'NULL' : typeof b[k] === 'object' ? JSON.stringify(b[k]) : String(b[k]);
  if (av !== bv) console.log(`[${k}] student=${av}  teacher=${bv}`);
}
const ia = (await c.query(`SELECT * FROM auth.identities WHERE user_id IN ($1,$2)`, [a.id, b.id])).rows;
for (const r of ia) console.log('IDENT', r.user_id === a.id ? 'student' : 'teacher', 'provider_id=', r.provider_id, 'identity_data=', JSON.stringify(r.identity_data));
await c.end();