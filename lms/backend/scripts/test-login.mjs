import 'dotenv/config';
const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_ANON_KEY;
for (const [e, p] of [
  ['admin@school.edu', 'admin123'],
  ['tanvi.choudhary1@genesis.edu', 'Student@123'],
  ['sneha.reddy@genesis.edu', 'Teacher@123'],
  ['usha.sharma11@genesis.edu', 'Parent@123'],
]) {
  const r = await fetch(`${u}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: k },
    body: JSON.stringify({ email: e, password: p }),
  });
  const d = await r.json();
  console.log(e, '->', d.access_token ? 'OK' : 'FAIL', d.code ?? '', d.msg ?? '', d.error_code ?? '');
}