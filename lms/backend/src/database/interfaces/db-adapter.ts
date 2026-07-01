import { Transaction } from './transaction';

export interface DbAdapter {
  get(collection: string, docId: string): Promise<any>;
  set(collection: string, docId: string, data: any): Promise<void>;
  update(collection: string, docId: string, data: any): Promise<void>;
  delete(collection: string, docId: string): Promise<void>;
  list(collection: string, query?: any): Promise<any[]>;
  runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;
}
