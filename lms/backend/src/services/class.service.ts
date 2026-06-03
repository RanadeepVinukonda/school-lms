import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

export async function createClass(data: {
  name: string;
  code: string;
  description?: string;
  grade?: string;
  section?: string;
  academicYear?: string;
  roomNumber?: string;
  teacherIds?: string[];
  subjectIds?: string[];
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const classId = uuidv4();
  const now = new Date().toISOString();

  const classData = {
    ...data,
    id: classId,
    studentCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await collections.classes().doc(classId).set(classData);

  logger.info('Class created', { classId, name: data.name, code: data.code });

  return { ...classData };
}

export async function updateClass(classId: string, data: Record<string, unknown>) {
  const ref = collections.classes().doc(classId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Class not found');
  }

  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await ref.update(updateData);

  const updated = await ref.get();
  logger.info('Class updated', { classId });

  return { ...updated.data() };
}

export async function deleteClass(classId: string) {
  const ref = collections.classes().doc(classId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Class not found');
  }

  await ref.delete();
  logger.info('Class deleted', { classId });
}

export async function listClasses(query: {
  page?: string;
  limit?: string;
  status?: string;
  teacherId?: string;
  academicYear?: string;
  search?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.classes();

  if (query.status) baseQuery = baseQuery.where('status', '==', query.status);
  if (query.academicYear) baseQuery = baseQuery.where('academicYear', '==', query.academicYear);

  baseQuery = baseQuery.orderBy('createdAt', 'desc');

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  let items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  if (query.teacherId) {
    items = items.filter((item: any) =>
      item.teacherIds?.includes(query.teacherId)
    );
  }

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

export async function getClassById(classId: string) {
  const ref = collections.classes().doc(classId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Class not found');
  }

  return { ...doc.data() };
}

export async function addStudents(classId: string, studentIds: string[]) {
  const classRef = collections.classes().doc(classId);
  const classDoc = await classRef.get();

  if (!classDoc.exists) {
    throw new NotFoundError('Class not found');
  }

  const batch = collections.classes().firestore.batch();

  for (const studentId of studentIds) {
    const userRef = collections.users().doc(studentId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const classIds = userData.classIds || [];
      if (!classIds.includes(classId)) {
        batch.update(userRef, { classIds: [...classIds, classId] });
      }
    }
  }

  await batch.commit();
  await classRef.update({
    studentCount: studentIds.length,
    updatedAt: new Date().toISOString(),
  });

  logger.info('Students added to class', { classId, count: studentIds.length });
}

export async function removeStudents(classId: string, studentIds: string[]) {
  const classRef = collections.classes().doc(classId);
  const classDoc = await classRef.get();

  if (!classDoc.exists) {
    throw new NotFoundError('Class not found');
  }

  const batch = collections.classes().firestore.batch();

  for (const studentId of studentIds) {
    const userRef = collections.users().doc(studentId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const classIds = (userData.classIds || []).filter((id: string) => id !== classId);
      batch.update(userRef, { classIds });
    }
  }

  await batch.commit();

  logger.info('Students removed from class', { classId, count: studentIds.length });
}

export async function getRoster(classId: string) {
  const snapshot = await collections.users()
    .where('classIds', 'array-contains', classId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const { password, ...safeData } = data;
    return { id: doc.id, ...safeData };
  });
}


