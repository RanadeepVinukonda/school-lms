/// <reference types="vite/client" />

declare module 'firebase/app' {
  const app: any;
  export default app;
  export const initializeApp: any;
  export const getApp: any;
  export const getApps: any;
  export const deleteApp: any;
  export type FirebaseApp = any;
  export type FirebaseOptions = any;
}

declare module 'firebase/auth' {
  const auth: any;
  export default auth;
  export const getAuth: any;
  export const signInWithEmailAndPassword: any;
  export const createUserWithEmailAndPassword: any;
  export const signOut: any;
  export const onAuthStateChanged: any;
  export const sendPasswordResetEmail: any;
  export const confirmPasswordReset: any;
  export const updatePassword: any;
  export const reauthenticateWithCredential: any;
  export const EmailAuthProvider: any;
  export type UserCredential = any;
  export type User = any;
  export type NextOrObserver<T> = any;
}

declare module 'firebase/firestore' {
  const firestore: any;
  export default firestore;
  export const getFirestore: any;
  export const collection: any;
  export const doc: any;
  export const getDoc: any;
  export const getDocs: any;
  export const addDoc: any;
  export const setDoc: any;
  export const updateDoc: any;
  export const deleteDoc: any;
  export const query: any;
  export const where: any;
  export const orderBy: any;
  export const limit: any;
  export const Timestamp: any;
  export const FieldValue: any;
  export const onSnapshot: any;
  export type Unsubscribe = any;
  export const writeBatch: any;
  export type WriteBatch = any;
  export const runTransaction: any;
  export type Transaction = any;
  export const arrayUnion: any;
  export const arrayRemove: any;
  export const increment: any;
  export const serverTimestamp: any;
  export const connectFirestoreEmulator: any;
}
