const { createClient } = require('C:/Users/Alrihab/Downloads/school-lms (3)/school-lms-build/lms/backend/node_modules/@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/Alrihab/Downloads/school-lms (3)/school-lms-build/lms/backend/.env' });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
(async () => {
  const { data, error } = await sb.auth.signInWithPassword({ email: '3a012026@school.edu', password: 'CXN0f&!7V3qo' });
  if (error) { console.error('LOGIN ERR', error.message); process.exit(1); }
  console.log(data.session.access_token);
})();
