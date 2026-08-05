#!/usr/bin/env node
/**
 * Live-enrich concept_videos for every concept in the database:
 *   Khan Academy videos first (priority), YouTube fallback.
 *
 * Usage (from lms/backend):  node scripts/video-sync.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import { syncConceptVideosForConcepts } from './lib/fetch-concept-videos.mjs';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const { rows: concepts } = await client.query(`
  SELECT c.id, c.title, c.chapter_id, c.textbook_id, c.video_links, tx.school_id,
         ch.title AS chapter, s.name AS subject_name
  FROM concepts c
  JOIN chapters ch ON ch.id = c.chapter_id
  JOIN textbooks tx ON tx.id = c.textbook_id
  LEFT JOIN subjects s ON s.id = tx.subject_id
  WHERE c.deleted_at IS NULL AND c.status IS DISTINCT FROM 'archived'
  ORDER BY ch."order", c."order"
`);
console.log(`\nSyncing ${concepts.length} concepts (Khan Academy first, YouTube fallback)…\n`);

await client.query('BEGIN');
const { summary, failed } = await syncConceptVideosForConcepts(client, concepts, {
  onProgress: (cpt) => process.stdout.write(`  · ${String(cpt.title).slice(0, 60)}\n`),
});
await client.query('COMMIT');

for (const s of summary) {
  const label = String(s.concept).padEnd(58).slice(0, 58);
  console.log(`  ${label} → Khan ${s.khan} · YouTube ${s.youtube} · total ${s.total}`);
}
for (const f of failed) {
  console.log(`  ✗ ${f.concept} — ${f.error}`);
}

const check = await client.query(`
  SELECT channel, count(*)::int AS n, count(DISTINCT concept_id)::int AS concepts
  FROM concept_videos GROUP BY channel ORDER BY n DESC
`);
console.log('\nconcept_videos after sync:');
for (const r of check.rows) console.log(`  ${String(r.channel).padEnd(24)} ${r.n} rows · ${r.concepts} concepts`);

console.log(`\nDone. ${summary.length} concepts refreshed${failed.length ? `, ${failed.length} failed (kept existing rows)` : ''}.`);
await client.end();
