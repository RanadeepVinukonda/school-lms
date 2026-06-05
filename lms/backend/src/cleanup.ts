import admin from 'firebase-admin';
import { initializeFirebase } from './config/firebase';

async function cleanup() {
  initializeFirebase();
  const db = admin.firestore();
  
  console.log('Starting cleanup of all collections except users...');
  
  // List of collections to delete (all except users)
  const collectionsToDelete = [
    'subjects', 
    'classes', 
    'enrollment', 
    'grades', 
    'assignments', 
    'submissions', 
    'exams', 
    'corrections', 
    'quizzes',
    'timetable',
    'notifications',
    'lessons'
  ];
  
  try {
    // Delete documents from each collection
    for (const collectionName of collectionsToDelete) {
      console.log(`Cleaning up collection: ${collectionName}`);
      const collection = db.collection(collectionName);
      const snapshot = await collection.get();
      
      const batch = db.batch();
      let count = 0;
      
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });
      
      if (count > 0) {
        await batch.commit();
        console.log(`  Deleted ${count} documents from ${collectionName}`);
      }
    }
    
    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});