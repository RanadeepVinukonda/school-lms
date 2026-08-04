import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const r = await c.query(`
  UPDATE auth.users au SET
    confirmation_token='', recovery_token='', email_change_token_new='', email_change='', email_change_token_current='', reauthentication_token='',
    phone_change='', phone_change_token='',
    phone = COALESCE(pu.phone_number, '0' || right(md5(au.email), 8))
  FROM public.users pu
  WHERE pu.id = au.id AND au.email <> 'admin@school.edu'
  RETURNING au.email
`);
console.log('patched token+phone:', r.rowCount);
await c.end();