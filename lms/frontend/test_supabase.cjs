import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jfqpukpzgmzwzzjrcxra.supabase.co', 'sb_publishable_fqk3AYibfJUOWj1pyqkfjA_WhT3Cl-i');

async function run() {
  const { data, error } = await supabase
    .from('firestore_docs')
    .select('*')
    .eq('collection', 'test_col')
    .eq('data->>subjectId', 'abc');
    
  console.log('Data:', data);
  if (error) console.error('Error:', error);
}
run();
