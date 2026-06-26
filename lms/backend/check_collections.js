const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const cols = ['classes', 'grades', 'assignments', 'exams'];
  for (const col of cols) {
    const res = await client.query(`SELECT data FROM firestore_docs WHERE collection = $1 LIMIT 1`, [col]);
    if (res.rows.length > 0) {
      console.log(`\n--- Schema for ${col} ---`);
      console.log(Object.keys(res.rows[0].data).join(', '));
    } else {
      console.log(`\n--- Schema for ${col} ---`);
      console.log("No data found");
    }
  }
  process.exit(0);
}
run().catch(console.error);
