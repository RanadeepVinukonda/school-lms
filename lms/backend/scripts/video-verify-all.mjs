import 'dotenv/config';
import pg from 'pg';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const concepts = (await c.query(`SELECT id, title FROM concepts ORDER BY chapter_id`)).rows;
let ok = 0, fail = 0;
for (const cp of concepts) {
  const r = await fetch(`${url}/rest/v1/concept_videos?concept_id=eq.${cp.id}&select=video_id,title,thumbnail&order=score.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const rows = await r.json();
  const n = Array.isArray(rows) ? rows.length : -1;
  const vid = Array.isArray(rows) && rows[0] ? rows[0].video_id : '';
  console.log(`${n >= 1 ? 'OK ' : 'MISS'} concept=${cp.id.slice(0, 8)} videos=${n} ${vid}`);
  if (n >= 1) ok++; else fail++;
}
console.log(`\nConcepts with visible videos: ${ok}/${concepts.length}`);
await c.end();