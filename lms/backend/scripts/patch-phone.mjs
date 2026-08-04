import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const { rows } = await c.query(`
  UPDATE auth.users au SET phone = pu.phone_number
  FROM public.users pu WHERE pu.id = au.id AND au.email <> 'admin@school.edu'
  RETURNING au.email, au.phone
`);
const dupes = rows.filter((r, i) => rows.findIndex(x => x.phone === r.phone) !== i);
console.log('patched', rows.length, '| duplicate phones:', dupes.length, dupes.slice(0, 5).map(d => d.phone).join(','));
await c.end();