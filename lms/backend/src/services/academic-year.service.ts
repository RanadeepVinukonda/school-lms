import { v4 as uuidv4 } from 'uuid';
import { collections } from '../database/adapter';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function createAcademicYear(data: {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  status?: string;
}) {
  const existing = await collections.academicYears()
    .where('code', '==', data.code)
    .get();
  if (!existing.empty) {
    throw new ConflictError('Academic year with this code already exists');
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  if (data.isCurrent) {
    const batch = collections.academicYears().firestore.batch();
    const prevSnap = await collections.academicYears()
      .where('isCurrent', '==', true)
      .get();
    prevSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { isCurrent: false, updatedAt: now });
    });
    const yearData = { ...data, id, status: data.status || 'active', createdAt: now, updatedAt: now };
    batch.create(collections.academicYears().doc(id), yearData);
    await batch.commit();
    return yearData;
  }

  const yearData = { ...data, id, status: data.status || 'active', createdAt: now, updatedAt: now };
  await collections.academicYears().doc(id).set(yearData);
  logger.info('Academic year created', { id, name: data.name });
  return yearData;
}

export async function updateAcademicYear(id: string, data: Record<string, unknown>) {
  const ref = collections.academicYears().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Academic year not found');

  if (data.isCurrent === true) {
    const now = new Date().toISOString();
    const batch = collections.academicYears().firestore.batch();
    const prevSnap = await collections.academicYears()
      .where('isCurrent', '==', true)
      .get();
    prevSnap.docs.forEach((d) => {
      if (d.id !== id) batch.update(d.ref, { isCurrent: false, updatedAt: now });
    });
    batch.update(ref, { ...data, updatedAt: now });
    await batch.commit();
  } else {
    await ref.update({ ...data, updatedAt: new Date().toISOString() });
  }

  const updated = await ref.get();
  return { ...updated.data() };
}

export async function deleteAcademicYear(id: string) {
  const ref = collections.academicYears().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Academic year not found');
  await ref.delete();
  logger.info('Academic year deleted', { id });
}

export async function getAcademicYearById(id: string) {
  const ref = collections.academicYears().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Academic year not found');
  return { ...doc.data() };
}

export async function listAcademicYears(query: { status?: string; page?: string; limit?: string }) {
  let baseQuery = collections.academicYears()
    .orderBy('createdAt', 'desc');

  if (query.status) baseQuery = baseQuery.where('status', '==', query.status);

  const snapshot = await baseQuery.get();
  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const total = items.length;

  if (query.page && query.limit) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    return { items: items.slice(offset, offset + limit), total, page, limit };
  }

  return { items, total, page: 1, limit: total };
}

export async function getCurrentAcademicYear() {
  const snap = await collections.academicYears()
    .where('isCurrent', '==', true)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { ...snap.docs[0].data() };
}
