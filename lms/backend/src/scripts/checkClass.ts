import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  client.query("SELECT doc_id, data FROM firestore_docs WHERE collection = 'classes';")
    .then(res => {
      console.log('Classes from DB:', res.rows.length);
      res.rows.forEach(r => console.log(r));
      client.end();
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      client.end();
      process.exit(1);
    });
});
