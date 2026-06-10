import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { initializeFirebase } from '../config/firebase';
import { getAdminFirestore } from '../firebase/admin';

async function main() {
  initializeFirebase();
  const db = getAdminFirestore();
  
  const snapshot = await db.collection('textbooks').get();
  console.log('Total textbooks:', snapshot.docs.length);
  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`- ${doc.id}: "${data.title}" status=${data.status} chapterCount=${data.chapterCount} hasChaptersArr=${Array.isArray(data.chapters)} chaptersLen=${data.chapters?.length}`);
    
    const chSnap = await db.collection('textbooks').doc(doc.id).collection('chapters').get();
    console.log(`  Chapters subcollection: ${chSnap.docs.length}`);
    for (const ch of chSnap.docs) {
      const cd = ch.data();
      console.log(`  - ${ch.id}: "${cd.title}" concepts=${cd.chapterCount}`);
    }
  }
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
