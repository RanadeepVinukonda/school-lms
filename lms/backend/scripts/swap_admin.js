const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

(async () => {
  // List all auth users
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error('List err:', listErr.message); process.exit(1); }
  console.log('Auth users found:', list.users.length);
  for (const u of list.users) {
    console.log(' -', u.email, u.id);
  }

  // Delete old admin@school.edu auth user if exists
  for (const u of list.users) {
    if (u.email === 'admin@school.edu') {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (error) console.warn('Del old auth err:', error.message);
      else console.log('Deleted auth user:', u.email);
    }
  }

  // Delete admin@school.com auth user if exists (from partial previous run)
  for (const u of list.users) {
    if (u.email === 'admin@school.com') {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (error) console.warn('Del existing auth err:', error.message);
      else console.log('Deleted existing auth user:', u.email);
    }
  }

  // Clean public.users for both emails
  await supabase.from('users').delete().eq('email', 'admin@school.edu');
  await supabase.from('users').delete().eq('email', 'admin@school.com');
  console.log('Cleaned public.users');

  // Create new admin in Supabase Auth
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email: 'admin@school.com',
    password: 'Admin@123456',
    email_confirm: true
  });
  if (createErr) { console.error('Create auth user err:', createErr.message); process.exit(1); }
  console.log('Created auth user:', newUser.user.id, newUser.user.email);

  // Insert into public.users
  const { error: insertErr } = await supabase.from('users').insert({
    id: newUser.user.id,
    email: 'admin@school.com',
    display_name: 'System Admin',
    role: 'admin',
    is_active: true,
    school_id: SCHOOL_ID,
    phone_number: '',
    photo_url: '',
    class_ids: [],
    children_ids: [],
    data: {},
    language: 'en'
  });
  if (insertErr) { console.error('Insert public user err:', insertErr.message); process.exit(1); }

  console.log('\nDone. Login: admin@school.com / Admin@123456');
  process.exit(0);
})();
