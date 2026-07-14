import { getSupabaseAdmin } from '../services/supabase';

async function main() {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .limit(1);

  console.log('Querying attendance table:');
  console.log('data:', data);
  console.log('error:', error);
}

main().catch(console.error);
