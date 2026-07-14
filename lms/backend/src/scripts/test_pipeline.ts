import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { getAdminFirestore } from '../database/admin';
import { processUploadInline } from '../services/pipeline.service';

async function main() {
  const db = getAdminFirestore();
  
  const tbId = 'ca1a8739-544f-4b81-8d6e-34fae0174a6e';
  const doc = await db.collection('textbooks').doc(tbId).get();
  
  if (!doc.exists) {
    console.error('Textbook does not exist in Firestore!');
    process.exit(1);
  }
  
  const data = doc.data()!;
  console.log('Textbook data:', {
    id: data.id,
    title: data.title,
    pdfUrl: data.pdfUrl,
    status: data.status,
    storagePath: data.storagePath
  });
  
  if (!data.pdfUrl) {
    console.error('Textbook has no pdfUrl!');
    process.exit(1);
  }
  
  console.log('Running processUploadInline...');
  try {
    await processUploadInline(tbId);
    console.log('processUploadInline completed successfully!');
  } catch (err: any) {
    console.error('processUploadInline failed with error:');
    console.error(err);
  }
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
