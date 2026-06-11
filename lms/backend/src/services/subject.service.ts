import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

/** Create a new subject within a class. */
export async function createSubject(data: {
  name: string;
  code: string;
  classId: string;
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
  if (!data.classId) {
    throw new Error('classId is required when creating a subject');
  }
  const subjectId = uuidv4();
  const now = new Date().toISOString();

  const subjectData = {
    ...data,
    id: subjectId,
    createdAt: now,
    updatedAt: now,
  };

  await collections.subjects().doc(subjectId).set(subjectData);

  logger.info('Subject created', { subjectId, name: data.name, code: data.code, classId: data.classId });

  return { ...subjectData };
}

/** Update subject fields. Throws NotFoundError if missing. */
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

/** Delete a subject by id. Throws NotFoundError if missing. */
export async function deleteSubject(subjectId: string) {
  const ref = collections.subjects().doc(subjectId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Subject not found');
  }

  await ref.delete();
  logger.info('Subject deleted', { subjectId });
}

/** List subjects with optional filters (status, category, department, classId, search), paginated. */
export async function listSubjects(query: {
  page?: string;
  limit?: string;
  status?: string;
  category?: string;
  department?: string;
  classId?: string;
  search?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.subjects();

  if (query.status) baseQuery = baseQuery.where('status', '==', query.status);
  if (query.category) baseQuery = baseQuery.where('category', '==', query.category);
  if (query.department) baseQuery = baseQuery.where('department', '==', query.department);
  if (query.classId) baseQuery = baseQuery.where('classId', '==', query.classId);

  const snapshot = await baseQuery.get();

  let items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  items = items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (query.search) {
    const search = query.search.toLowerCase();
    items = items.filter(
      (item: { id?: string; name?: string; code?: string }) =>
        item.name?.toLowerCase().includes(search) ||
        item.code?.toLowerCase().includes(search)
    );
  }

  const total = items.length;
  const offset = (page - 1) * limit;
  const paged = items.slice(offset, offset + limit);

  return { items: paged, total, page, limit };
}

/** List subjects by class. */
export async function listSubjectsByClass(classId: string) {
  const snap = await collections.subjects()
    .where('classId', '==', classId)
    .get();
  const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Fetch a single subject by id. Throws NotFoundError if missing. */
export async function getSubjectById(subjectId: string) {
  const ref = collections.subjects().doc(subjectId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Subject not found');
  }

  return { ...doc.data() };
}
