import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { getAdminFirestore } from '../database/admin';

async function main() {
  const db = getAdminFirestore();
  
  const textbookId = 'cOvlSclW9Eg7aXp8dfeV';
  await db.collection('textbooks').doc(textbookId).update({
    chapters: [],
    chapterCount: 5,
  });
  console.log('Updated. Now fetching to verify...');
  
  const doc = await db.collection('textbooks').doc(textbookId).get();
  const data = doc.data();
  console.log('Title:', data?.title);
  console.log('chapterCount:', data?.chapterCount);
  console.log('chapters is array:', Array.isArray(data?.chapters));
  console.log('chapters length:', data?.chapters?.length);
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
