/**
 * Compatibility shim — maps legacy FirebaseFirestore namespace to Supabase adapter types.
 *
 * These types replace the old `any` aliases with structured types that still
 * permit the chainable `.where().orderBy().limit().get()` pattern used throughout
 * the services, without requiring changes to every call site.
 *
 * Task 6.8: Firebase type leaks replaced. Services can migrate to direct adapter
 * imports incrementally; this shim keeps them compiling in the meantime.
 */

declare namespace FirebaseFirestore {
  // A chainable query — compatible with ColRef and Query from query-builder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Query = any;

  // Collection — compatible with ColRef; also has doc(), add(), firestore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type CollectionReference = any;

  interface DocumentReference {
    readonly id: string;
    get(): Promise<DocumentSnapshot>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set(data: DocumentData, options?: { merge?: boolean }): Promise<any>;
    update(data: Partial<DocumentData>): Promise<void>;
    delete(): Promise<void>;
    collection(name: string): CollectionReference;
    listCollections(): Promise<CollectionReference[]>;
    readonly ref: DocumentReference;
  }

  interface DocumentSnapshot {
    readonly id: string;
    readonly exists: boolean;
    data(): DocumentData | undefined;
    readonly ref: DocumentReference;
  }

  interface QueryDocumentSnapshot extends DocumentSnapshot {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data(): any;
  }

  interface QuerySnapshot {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly docs: any[];
    readonly size: number;
    readonly empty: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    forEach(fn: (doc: any) => void): void;
  }

  interface Transaction {
    get(ref: DocumentReference): Promise<DocumentSnapshot>;
    set(ref: DocumentReference, data: DocumentData): void;
    update(ref: DocumentReference, data: Partial<DocumentData>): void;
    delete(ref: DocumentReference): void;
  }

  interface WriteBatch {
    set(ref: DocumentReference, data: DocumentData): WriteBatch;
    update(ref: DocumentReference, data: Partial<DocumentData>): WriteBatch;
    delete(ref: DocumentReference): WriteBatch;
    commit(): Promise<void>;
  }

  interface Firestore {
    collection(path: string): CollectionReference;
    doc(path: string): DocumentReference;
    batch(): WriteBatch;
    runTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  }

  type DocumentData = any; // eslint-disable-line @typescript-eslint/no-explicit-any
  type Timestamp = { seconds: number; nanoseconds: number; toDate(): Date };
  type FieldValue = unknown;
}
