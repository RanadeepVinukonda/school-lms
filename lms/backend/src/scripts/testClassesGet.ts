import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { collections } from '../database/adapter';

async function test() {
  const classes = await collections.classes().limit(10).get();
  console.log('Classes count:', classes.size);
  if (classes.size > 0) {
    console.log('First class:', classes.docs[0].data());
  }
}

test().catch(console.error);
