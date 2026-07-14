const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  await client.query("NOTIFY pgrst, 'reload schema'");
  console.log('PostgREST cache reloaded!');
  client.end();
}
run().catch(console.error);
