import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const q = async (sql, ...a) => (await c.query(sql, a)).rows;
const q1 = async (sql, ...a) => (await c.query(sql, a)).rows[0];

console.log('=== 1. concept_videos total + school_id breakdown (bypass RLS via service role) ===');
console.log(await q(`SELECT count(*) total, count(school_id) has_school, count(*) - count(school_id) null_school FROM concept_videos`));

console.log('\n=== 2. sample concept_videos rows ===');
console.log(await q(`SELECT id, concept_id, video_id, title, school_id, thumbnail FROM concept_videos LIMIT 5`));

console.log('\n=== 3. the SELECT RLS policies on concept_videos ===');
console.log(await q(`SELECT policyname, cmd, permissive, qual FROM pg_policies WHERE tablename='concept_videos'`));

console.log('\n=== 4. concepts -> textbooks -> school_id mapping ===');
console.log(await q(`
  SELECT cv.id cv_id, cv.video_id, cv.title,
         tx.school_id textbook_school_id,
         cv.school_id video_school_id
  FROM concept_videos cv
  LEFT JOIN concepts c ON c.id = cv.concept_id
  LEFT JOIN textbooks tx ON tx.id = cv.textbook_id
  LIMIT 5
`));

console.log('\n=== 5. does the concepts table even have school_id / textbooks have school_id? ===');
console.log(await q1(`SELECT (SELECT count(*) FROM information_schema.columns WHERE table_name='concept_videos' AND column_name='school_id') cv_school_col,
 (SELECT count(*) FROM information_schema.columns WHERE table_name='textbooks' AND column_name='school_id') tb_school_col,
 (SELECT count(*) FROM information_schema.columns WHERE table_name='concepts' AND column_name='school_id') c_school_col`));

console.log('\n=== 6. textbooks present + their school_id ===');
console.log(await q(`SELECT id, title, school_id FROM textbooks LIMIT 10`));

await c.end();