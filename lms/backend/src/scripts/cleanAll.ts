import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getAdminAuth, getAdminFirestore, admin } from '../firebase/admin';
const auth = getAdminAuth();
const db = getAdminFirestore();

async function deleteAllDocs() {
  console.log('=== COMPLETE FIRESTORE CLEANUP ===\n');

  // 1. Recursively delete all root-level collection documents
  const collections = await db.listCollections();
  for (const col of collections) {
    const docIds: string[] = [];
    // Collect doc IDs first (fast)
    const snap = await col.select().get();
    if (snap.empty) {
      console.log(`  ${col.id}: empty`);
      continue;
    }
    const docs = snap.docs.map(d => d.ref);
    console.log(`  ${col.id}: deleting ${docs.length} docs with subcollections...`);
    // Delete in parallel batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(d => admin.firestore().recursiveDelete(d)));
    }
    console.log(`  ${col.id}: done`);
  }

  // 2. Delete all Firebase Auth users
  console.log('\nClearing Firebase Auth users...');
  let listUsersResult = await auth.listUsers(1000);
  while (listUsersResult.users.length > 0) {
    const uids = listUsersResult.users.map((u) => u.uid);
    await auth.deleteUsers(uids);
    console.log(`  Deleted ${uids.length} Auth users.`);
    listUsersResult = await auth.listUsers(1000);
  }
  console.log('  All Auth users removed.\n');
}

deleteAllDocs()
  .then(() => {
    console.log('=== CLEANUP COMPLETE ===');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
