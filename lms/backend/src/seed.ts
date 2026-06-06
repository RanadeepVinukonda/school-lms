import { initializeFirebase } from './config/firebase';

async function seed() {
  initializeFirebase();
  console.log('Firebase initialized. No seed data — add users and data manually through the app or Firebase Console.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
