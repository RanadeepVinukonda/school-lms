import admin from 'firebase-admin';
import { getFirebaseApp } from '../config/firebase';

let authInstance: admin.auth.Auth;
let firestoreInstance: admin.firestore.Firestore;
let storageInstance: admin.storage.Storage;

export function getAdminAuth(): admin.auth.Auth {
  if (!authInstance) {
    authInstance = getFirebaseApp().auth();
  }
  return authInstance;
}

export function getAdminFirestore(): admin.firestore.Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirebaseApp().firestore();
  }
  return firestoreInstance;
}

export function getAdminStorage(): admin.storage.Storage {
  if (!storageInstance) {
    storageInstance = getFirebaseApp().storage();
  }
  return storageInstance;
}

export { admin };
