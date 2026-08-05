import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'crypto';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (sql, ...a) => (await c.query(sql, a)).rows;

console.log('=== concept_videos columns ===');
for (const r of await q(`SELECT column_name,is_nullable,column_default FROM information_schema.columns WHERE table_name='concept_videos' ORDER BY ordinal_position`)) {
  console.log(`  ${r.column_name} | ${r.is_nullable} | ${r.column_default ?? ''}`);
}

const concepts = await q(`
  SELECT c.id, c.title, c.chapter_id, c.textbook_id, c.video_links, tx.school_id
  FROM concepts c
  JOIN textbooks tx ON tx.id = c.textbook_id
`);
const schoolId = concepts[0]?.school_id;
console.log(`\nConcepts to process: ${concepts.length}  (school_id=${schoolId})`);

const inserts = [];
for (const cpt of concepts) {
  for (const link of (cpt.video_links || [])) {
    const m = String(link).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    const videoId = m ? m[1] : null;
    if (!videoId) continue;
    inserts.push({
      id: randomUUID(),
      concept_id: cpt.id,
      textbook_id: cpt.textbook_id,
      chapter_id: cpt.chapter_id,
      school_id: cpt.school_id,
      video_id: videoId,
      title: cpt.title,
      description: '',
      channel: 'YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: '',
      score: 1.0,
      data: JSON.stringify({
        source: 'youtube',
        sourceLabel: 'YouTube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      }),
    });
  }
}
console.log(`\nRows to insert into concept_videos: ${inserts.length}`);

const BATCH = 50;
let inserted = 0;
for (let i = 0; i < inserts.length; i += BATCH) {
  const chunk = inserts.slice(i, i + BATCH);
  const cols = ['id','concept_id','textbook_id','chapter_id','school_id','video_id','title','description','channel','thumbnail','duration','score','data'];
  const params = [];
  const ph = [];
  for (const row of chunk) {
    const rowPh = cols.map(cn => { params.push(row[cn]); return `$${params.length}`; });
    ph.push(`(${rowPh.join(', ')})`);
  }
  const sql = `INSERT INTO concept_videos (${cols.map(cn=>'"'+cn+'"').join(', ')}) VALUES ${ph.join(', ')}`;
  const r = await c.query(sql, params);
  inserted += r.rowCount || 0;
}
console.log(`\nInserted new: ${inserted}`);

const check = await q(`SELECT count(*) total, count(DISTINCT concept_id) concepts_with_videos FROM concept_videos`);
console.log('After repair:', JSON.stringify(check[0]));

await c.end();