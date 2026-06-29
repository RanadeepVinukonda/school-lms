import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'classes';")
    .then(res => {
      console.log('Columns for classes:');
      res.rows.forEach(r => console.log(r.column_name));
      client.end();
      process.exit(0);
    })
    .catch(e => {
      console.error(e);
      client.end();
      process.exit(1);
    });
});
