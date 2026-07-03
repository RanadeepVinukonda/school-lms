import { getSupabaseAdmin } from '../services/supabase';

const sql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;`;

async function main() {
  const sup = getSupabaseAdmin();
  if (!sup) {
    console.error('No Supabase admin client');
    process.exit(1);
  }
  const { data, error } = await sup.rpc('exec_sql', { sql });
  if (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
  console.log('Gender column added to users table');
}

main();
