const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  
  // Insert a test doc
  await client.query(`
    INSERT INTO firestore_docs (collection, doc_id, data) 
    VALUES ('test_col', '123', '{"subjectId": "abc", "name": "Test"}')
    ON CONFLICT DO NOTHING
  `);

  // Query using jsonb operator
  const res = await client.query(`SELECT doc_id, data FROM firestore_docs WHERE collection = 'test_col' AND data->>'subjectId' = 'abc'`);
  console.log("Query result:", res.rows);
  process.exit(0);
}
run().catch(console.error);
