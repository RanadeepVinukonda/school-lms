// ponytail: type stubs for firebase-admin types — existing code compiles without firebase-admin installed

declare module '../firebase/firestore' {
  export type DocumentReference = any;
  export type Query = any;
  export type CollectionReference = any;
  export type DocumentData = any;
  export type Transaction = any;
  export type WriteBatch = any;
  export type Timestamp = any;
  export type FieldValue = any;
  export const FieldValue: any;
  export const Timestamp: any;
  export const Query: any;
}

declare namespace FirebaseFirestore {
  type DocumentReference = any;
  type Query = any;
  type CollectionReference = any;
  type DocumentData = any;
  type Transaction = any;
  type WriteBatch = any;
  type Timestamp = any;
  type FieldValue = any;
  type QuerySnapshot = any;
  type QueryDocumentSnapshot = any;
  type DocumentSnapshot = any;
}
