import admin from 'firebase-admin';
import { initializeFirebase } from './config/firebase';

const ADMIN_UID = 'a1';

async function cleanup() {
  initializeFirebase();
  const db = admin.firestore();
  const auth = admin.auth();

  console.log('Removing all data except admin credentials...');

  // 1. Delete all documents from non-user collections
  const collectionsToDelete = [
    'subjects', 'classes', 'enrollment', 'grades',
    'assignments', 'submissions', 'exams', 'corrections',
    'quizzes', 'timetable', 'notifications', 'lessons',
    'textbooks', 'chapters', 'concepts', 'videos', 'questions',
  ];

  for (const collectionName of collectionsToDelete) {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) { console.log(`  ${collectionName}: empty`); continue; }
    const batch = db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  ${collectionName}: ${snapshot.size} docs deleted`);
  }

  // 2. Delete all user docs from Firestore except admin
  const usersSnap = await db.collection('users').get();
  const adminUserRef = db.collection('users').doc(ADMIN_UID);
  const batch = db.batch();
  let userCount = 0;
  usersSnap.forEach((doc) => {
    if (doc.id !== ADMIN_UID) {
      batch.delete(doc.ref);
      userCount++;
    }
  });
  if (userCount > 0) {
    await batch.commit();
    console.log(`  users: ${userCount} non-admin docs deleted`);
  }

  // 3. Delete all Firebase Auth users except admin
  const listResult = await auth.listUsers();
  const deleteUids = listResult.users
    .filter((u) => u.uid !== ADMIN_UID)
    .map((u) => u.uid);
  if (deleteUids.length > 0) {
    await auth.deleteUsers(deleteUids);
    console.log(`  auth: ${deleteUids.length} non-admin users deleted`);
  }

  // 4. Verify admin still exists
  const adminDoc = await adminUserRef.get();
  if (adminDoc.exists) {
    console.log('\nAdmin credentials preserved:');
    console.log('  Email: admin@genesis.edu');
    console.log('  Role: admin');
  }

  console.log('\nCleanup complete. Only admin remains.');
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
