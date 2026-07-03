import { getSupabaseAdmin } from '../services/supabase';

async function main() {
  const sup = getSupabaseAdmin();
  if (!sup) { console.error('No supabase'); return; }
  const { data } = await sup.from('classes').select('*').limit(5);
  console.log(JSON.stringify(data, null, 2));
}
main();
