import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (sql, ...a) => (await c.query(sql, a)).rows;

console.log('=== concept_videos: channel/source distribution (the Teach page datasource) ===');
console.log(await q(`SELECT channel, count(*) FROM concept_videos GROUP BY channel`));
console.log('\n=== data.source distribution ===');
console.log(await q(`SELECT data->>'source' source, data->>'sourceLabel' label, count(*) FROM concept_videos GROUP BY 1,2`));
console.log('\n=== any Khan Academy rows anywhere? concept_resources ===');
console.log(await q(`SELECT source, count(*) FROM concept_resources GROUP BY source`));
await c.end();