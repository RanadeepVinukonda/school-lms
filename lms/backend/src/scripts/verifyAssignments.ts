import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { getAdminFirestore } from '../database/admin';
const db = getAdminFirestore();

async function main() {
  console.log('=== Users ===');
  const users = await db.collection('users').get();
  users.docs.forEach((doc: any) => {
    console.log(`  ID: ${doc.id}, Name: ${doc.data().displayName}, Role: ${doc.data().role}, Email: ${doc.data().email}`);
  });

  console.log('\n=== Assignments ===');
  const assignments = await db.collection('teacherClassSubject').get();
  assignments.docs.forEach((doc: any) => {
    console.log(`  ID: ${doc.id}, TeacherId: ${doc.data().teacherId}, ClassId: ${doc.data().classId}, SubjectId: ${doc.data().subjectId}`);
  });

  console.log('\n=== Textbooks ===');
  const textbooks = await db.collection('textbooks').get();
  textbooks.docs.forEach((doc: any) => {
    console.log(`  ID: ${doc.id}, Title: ${doc.data().title}, ClassId: ${doc.data().classId}, SubjectId: ${doc.data().subjectId}, Status: ${doc.data().status}`);
  });

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
