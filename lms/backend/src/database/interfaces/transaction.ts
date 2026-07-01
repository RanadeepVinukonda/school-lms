export interface Transaction {
  get(collection: string, docId: string): Promise<any>;
  set(collection: string, docId: string, data: any): Promise<void>;
  update(collection: string, docId: string, data: any): Promise<void>;
  delete(collection: string, docId: string): Promise<void>;
}
