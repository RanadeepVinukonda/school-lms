import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

export async function createSubject(data: {
  name: string;
  code: string;
  description?: string;
  category?: string;
  credits?: number;
  department?: string;
  thumbnail?: string;
  isElective?: boolean;
  gradeLevels?: string[];
  tags?: string[];
  syllabus?: string;
  status?: string;
}) {
  const subjectId = uuidv4();
  const now = new Date().toISOString();

  const subjectData = {
    ...data,
    id: subjectId,
    createdAt: now,
    updatedAt: now,
  };

  await collections.subjects().doc(subjectId).set(subjectData);

  logger.info('Subject created', { subjectId, name: data.name, code: data.code });

  return { ...subjectData };
}

export async function updateSubject(subjectId: string, data: Record<string, unknown>) {
  const ref = collections.subjects().doc(subjectId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Subject not found');
  }

  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await ref.update(updateData);

  const updated = await ref.get();
  logger.info('Subject updated', { subjectId });

  return { ...updated.data() };
}

export async function deleteSubject(subjectId: string) {
  const ref = collections.subjects().doc(subjectId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Subject not found');
  }

  await ref.delete();
  logger.info('Subject deleted', { subjectId });
}

export async function listSubjects(query: {
  page?: string;
  limit?: string;
  status?: string;
  category?: string;
  department?: string;
  search?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.subjects();

  if (query.status) baseQuery = baseQuery.where('status', '==', query.status);
  if (query.category) baseQuery = baseQuery.where('category', '==', query.category);
  if (query.department) baseQuery = baseQuery.where('department', '==', query.department);

  baseQuery = baseQuery.orderBy('createdAt', 'desc');

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  let items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  if (query.search) {
    const search = query.search.toLowerCase();
    items = items.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(search) ||
        item.code?.toLowerCase().includes(search)
    );
  }

  return { items, total, page, limit };
}

export async function getSubjectById(subjectId: string) {
  const ref = collections.subjects().doc(subjectId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Subject not found');
  }

  return { ...doc.data() };
}


