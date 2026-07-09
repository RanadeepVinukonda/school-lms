import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseAdmin } from '../services/supabase';

async function main() {
  console.log('=== CREATING ADMIN USER AND DEFAULT SCHOOL ===');
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin not configured');

  const email = 'admin@school.com';
  const password = 'Admin@123456';
  const schoolId = '00000000-0000-0000-0000-000000000001';

  try {
    // 1. Create or upsert default school
    console.log(`Upserting default school with ID: ${schoolId}...`);
    const { error: schoolError } = await supabase
      .from('schools')
      .upsert({
        id: schoolId,
        name: 'Genesis School',
        subdomain: 'genesis',
        primary_color: '#6366f1',
        plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    if (schoolError) throw schoolError;

    // 2. Check if user already exists in Auth
    console.log(`Checking if ${email} exists in Auth...`);
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let authUser = authUsers.users.find(u => u.email === email);
    let userId: string;

    if (!authUser) {
      console.log(`Creating user ${email} in Auth...`);
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (createError) throw createError;
      userId = createData.user.id;
      console.log(`Created Auth user with ID: ${userId}`);
    } else {
      userId = authUser.id;
      console.log(`Found existing Auth user with ID: ${userId}`);
    }

    // 3. Upsert into public.users table referencing the school
    console.log(`Upserting ${email} into public.users table...`);
    const { data: userRow, error: dbError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        display_name: 'Super Admin',
        role: 'admin',
        is_active: true,
        school_id: schoolId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) throw dbError;
    console.log('Admin user successfully created in public.users table:', userRow);
    console.log(`Credentials:\nEmail: ${email}\nPassword: ${password}`);
    console.log('=== SUCCESS ===');
  } catch (err) {
    console.error('Failed to create admin user:', err);
  } finally {
    process.exit(0);
  }
}

main();
