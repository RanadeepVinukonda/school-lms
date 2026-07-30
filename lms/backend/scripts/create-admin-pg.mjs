import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('Missing DATABASE_URL in .env'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  console.log('Creating admin user via direct pg connection...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete existing admin@school.edu auth user if exists
    const existing = await client.query(`SELECT id FROM auth.users WHERE email = 'admin@school.edu'`);
    if (existing.rows.length > 0) {
      const uid = existing.rows[0].id;
      await client.query(`DELETE FROM auth.users WHERE id = $1`, [uid]);
      await client.query(`DELETE FROM public.users WHERE id = $1`, [uid]);
      console.log(`Deleted existing auth user: ${uid}`);
    }

    // 2. Create auth user via auth.users table with bcrypt password
    const res = await client.query(`
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        role, aud, confirmation_token, recovery_token, is_super_admin
      ) VALUES (
        gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
        'admin@school.edu',
        crypt('admin123', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"display_name":"School Admin"}',
        now(), now(),
        'authenticated', 'authenticated',
        '', '', true
      )
      RETURNING id
    `);
    const uid = res.rows[0].id;
    console.log(`Auth user created: ${uid}`);

    // 3. Insert into public.users
    await client.query(`
      INSERT INTO public.users (
        id, email, display_name, role, is_active,
        phone_number, photo_url, class_ids, school_id,
        children_ids, data, created_at, updated_at
      ) VALUES (
        $1, 'admin@school.edu', 'School Admin', 'super_admin', true,
        '+91-9000000001', '', '{}',
        '00000000-0000-0000-0000-000000000001',
        '{}', '{"designation":"Principal"}',
        now(), now()
      )
    `, [uid]);

    // 4. Insert identity for auth
    await client.query(`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1,
        jsonb_build_object('sub', $1::text, 'email', 'admin@school.edu'),
        'email', 'admin@school.edu',
        now(), now(), now()
      )
    `, [uid]);

    await client.query('COMMIT');

    console.log(`\n=== ADMIN READY ===`);
    console.log(`   Email:   admin@school.edu`);
    console.log(`   Pass:    admin123`);
    console.log(`   Role:    super_admin`);
    console.log(`   School:  00000000-0000-0000-0000-000000000001`);

    // 5. Verify login
    console.log(`\nVerifying login...`);
    const loginRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: 'admin@school.edu', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    if (loginData.access_token) {
      console.log(`   Login OK — JWT obtained`);
    } else {
      console.log(`   Login response:`, JSON.stringify(loginData).substring(0, 200));
    }

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('FATAL:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
