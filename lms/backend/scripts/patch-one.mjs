import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const email = 'tanvi.choudhary1@genesis.edu';
const role = (await c.query(`SELECT role FROM public.users WHERE email=$1`, [email])).rows[0].role;
await c.query(`UPDATE auth.users SET
  confirmation_token='', recovery_token='', email_change_token_new='', email_change='', email_change_token_current='', reauthentication_token='',
  raw_app_meta_data=$2,
  raw_user_meta_data=$3,
  phone='', phone_change='', phone_change_token=''
  WHERE email=$1`, [email,
  JSON.stringify({ role, provider: 'email', providers: ['email'] }),
  JSON.stringify({ email_verified: true })
]);
await c.end();
console.log('patched', email, 'role', role);