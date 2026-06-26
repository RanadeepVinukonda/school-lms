import { Query } from '../firebase/firestore';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(query: {
  page?: string;
  limit?: string;
}): PaginationParams {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export async function paginateQuery<T>(
  baseQuery: Query,
  page: number,
  limit: number
): Promise<{ items: T[]; total: number }> {
  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];

  return { items, total };
}

export async function getDocumentById<T>(
  collectionPath: string,
  id: string
): Promise<{ id: string; data: T } | null> {
  const { getCollection } = await import('../firebase/firestore');
  const doc = await getCollection(collectionPath).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, data: doc.data() as T };
}
