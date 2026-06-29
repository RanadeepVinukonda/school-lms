import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getSupabaseAdmin } from '../services/supabase';

async function resetDatabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  console.log('=== STARTING DESTRUCTIVE DATABASE RESET ===');

  try {
    // 1. Delete all textbooks (cascades to all AI content: concepts, notes, etc.)
    console.log('Deleting all textbooks and cascading AI content...');
    const { error: err1 } = await supabase.from('textbooks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) throw err1;

    // 2. Delete all NoSQL data
    console.log('Deleting all NoSQL generic data...');
    const { error: err2 } = await supabase.from('nosql_docs').delete().neq('collection', 'DO_NOT_DELETE');
    if (err2) {
       console.log('nosql_docs might not exist yet, ignoring...', err2.message);
    }
    
    // Also try dropping old firestore_docs if it exists
    const { error: errOld } = await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS firestore_docs;' });
    if (errOld) {
        console.log('Could not drop firestore_docs (might not have exec_sql or already dropped)');
    }

    // 3. Keep admins, delete all other users from public.users
    console.log('Finding admins...');
    const { data: admins, error: err3 } = await supabase.from('users').select('id').eq('role', 'admin');
    if (err3) throw err3;

    const adminIds = admins?.map(a => a.id) || [];
    console.log(`Found ${adminIds.length} admins to preserve.`);

    console.log('Deleting non-admin users from public.users...');
    if (adminIds.length > 0) {
      const { error: err4 } = await supabase.from('users').delete().not('id', 'in', `(${adminIds.join(',')})`);
      if (err4) throw err4;
    } else {
      const { error: err4 } = await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err4) throw err4;
    }

    // 4. Delete Auth users
    console.log('Deleting non-admin Auth users...');
    const { data: authUsers, error: err5 } = await supabase.auth.admin.listUsers();
    if (err5) throw err5;
    
    let deletedCount = 0;
    for (const user of authUsers.users) {
      if (!adminIds.includes(user.id)) {
        const { error: err6 } = await supabase.auth.admin.deleteUser(user.id);
        if (err6) console.error(`Failed to delete Auth User ${user.id}`, err6);
        else deletedCount++;
      }
    }
    console.log(`Deleted ${deletedCount} Auth users.`);
    
    console.log('=== RESET COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
