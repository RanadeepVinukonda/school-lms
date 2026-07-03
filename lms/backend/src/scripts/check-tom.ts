import { getSupabaseAdmin } from '../services/supabase';

async function main() {
  const sup = getSupabaseAdmin();
  if (!sup) { console.error('No supabase'); return; }

  // Check parent user (oggy)
  const { data: parents } = await sup
    .from('users')
    .select('id,display_name,role,children_ids,class_id')
    .ilike('display_name', '%oggy%');

  console.log('Parent "oggy":', JSON.stringify(parents, null, 2));

  // Check Tom again with his full data
  const { data: toms } = await sup
    .from('users')
    .select('*')
    .ilike('display_name', '%tom%');

  if (toms && toms.length > 0) {
    console.log('Tom full:', JSON.stringify(toms[0], null, 2));
  }

  // Check if there are any classes for tom's class_id
  if (toms && toms.length > 0) {
    const { data: cls } = await sup
      .from('classes')
      .select('id,name')
      .eq('id', toms[0].class_id);
    console.log('Class:', JSON.stringify(cls, null, 2));
  }
}

main();
