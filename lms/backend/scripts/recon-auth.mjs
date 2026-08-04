import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
async function q(t, p) { const { rows } = await pool.query(t, p); return rows; }
async function main(){
  for (const t of ['auth.users','auth.identities','auth.sessions','public.enrollment']){
    try{
      const cols = await q(`select column_name, data_type, is_nullable from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`, t.split('.'));
      console.log(`\n@@@ ${t}`);
      console.log(cols.map(c=>`${c.column_name}:${c.data_type}${c.is_nullable==='NO'?'!':''}`).join(' | '));
    }catch(e){ console.log(`\n@@@ ${t}: ERR ${e.message}`); }
  }
  console.log('\nauth.users count:', (await q(`select count(*) c from auth.users`))[0].c);
  console.log('current auth emails:', JSON.stringify((await q(`select email from auth.users`)).map(r=>r.email)));
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(1);}).finally(()=>pool.end());