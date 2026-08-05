import 'dotenv/config';
import pg from 'pg';
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !anon) { console.error('Missing SUPABASE_URL/SUPABASE_ANON_KEY'); process.exit(1); }

const sample = await db.query(`SELECT id, title FROM concepts ORDER BY chapter_id, "order" LIMIT 3`);
await db.end();

for (const c of sample.rows) {
  const r = await fetch(`${url}/rest/v1/concept_videos?concept_id=eq.${c.id}&select=video_id,title,channel,score,duration&order=score.desc`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  const rows = await r.json();
  console.log(`\n${c.title}  (HTTP ${r.status})`);
  for (const v of rows) console.log(`   ${v.score}  [${v.channel}] ${v.title}  id=${v.video_id} dur=${v.duration || '—'}`);
}
