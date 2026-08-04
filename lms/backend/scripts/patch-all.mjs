import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const rows = (await c.query(`
  SELECT au.email, pu.role FROM auth.users au
  JOIN public.users pu ON pu.id = au.id
  WHERE au.email <> 'admin@school.edu'
`)).rows;
for (const r of rows) {
  await c.query(`UPDATE auth.users SET
    confirmation_token='', recovery_token='', email_change_token_new='', email_change='', email_change_token_current='', reauthentication_token='',
    raw_app_meta_data=$2, raw_user_meta_data=$3, phone=NULL, phone_change=NULL, phone_change_token=NULL
    WHERE email=$1`,
    [r.email, JSON.stringify({ role: r.role, provider: 'email', providers: ['email'] }), JSON.stringify({ email_verified: true })]);
}
await c.end();
console.log('patched', rows.length, 'non-admin auth users');