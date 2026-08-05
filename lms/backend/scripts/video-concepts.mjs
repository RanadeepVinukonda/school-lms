import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (sql, ...a) => (await c.query(sql, a)).rows;
console.log('=== concepts per chapter ===');
console.log(await q(`
  SELECT ch.id chapter_id, ch.title chapter_title, t.id textbook_id, t.title textbook_title,
         count(c.id) concepts
  FROM chapters ch
  JOIN textbooks t ON t.id = ch.textbook_id
  LEFT JOIN concepts c ON c.chapter_id = ch.id
  GROUP BY ch.id, ch.title, t.id, t.title
`));
console.log('\n=== concepts (id, title, chapter, video_links) ===');
console.log(await q(`SELECT id, title, chapter_id, video_links FROM concepts ORDER BY chapter_id, "order"`));
await c.end();