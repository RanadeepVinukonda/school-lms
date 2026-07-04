import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { getSupabaseAdmin } from '../services/supabase';

async function test() {
  const supabase = getSupabaseAdmin()!;
  const { data: classes } = await supabase.from('classes').select('*').limit(10);
  console.log('Classes count:', classes?.length || 0);
  if (classes && classes.length > 0) {
    console.log('First class:', classes[0]);
  }
}

test().catch(console.error);
