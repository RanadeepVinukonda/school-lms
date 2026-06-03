import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCpoXb042QuXAtzBwJO5yNpWLrwwef4-_Y",
  authDomain: "school-ca94b.firebaseapp.com",
  projectId: "school-ca94b",
  storageBucket: "school-ca94b.firebasestorage.app",
  messagingSenderId: "723102095387",
  appId: "1:723102095387:web:7e7e2539f1cd2a976440be",
  measurementId: "G-XLR0M2LK1L"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let messaging: ReturnType<typeof getMessaging> | null = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});
export { messaging };

export default app;
