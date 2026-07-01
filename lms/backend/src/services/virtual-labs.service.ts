import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from '../database/adapter';
import { collections } from '../database/adapter';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface LabElement {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  properties: Record<string, unknown>;
}

export interface VirtualLab {
  id?: string;
  title: string;
  subject: 'physics' | 'chemistry' | 'biology';
  topic: string;
  description: string;
  type: 'circuit' | 'mechanics' | 'reaction' | 'cell' | 'custom';
  config: {
    elements: LabElement[];
    initialState: Record<string, unknown>;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  classIds: string[];
  createdAt: string;
}

export async function getAllLabs() {
  const snapshot = await collections.virtualLabs()
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getLabById(id: string) {
  const snap = await collections.virtualLabs().doc(id).get();
  if (!snap.exists) throw new NotFoundError('Virtual lab not found');
  return { id: snap.id, ...snap.data() };
}

export async function createLab(data: Omit<VirtualLab, 'id' | 'createdAt'>) {
  const lab: VirtualLab = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  const ref = collections.virtualLabs().doc();
  await ref.set(lab);
  logger.info('Virtual lab created', { id: ref.id, title: lab.title });
  return { id: ref.id, ...lab };
}

export async function updateLab(id: string, data: Partial<VirtualLab>) {
  const snap = await collections.virtualLabs().doc(id).get();
  if (!snap.exists) throw new NotFoundError('Virtual lab not found');
  await collections.virtualLabs().doc(id).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  const updated = await collections.virtualLabs().doc(id).get();
  return { id: updated.id, ...updated.data() };
}

export async function deleteLab(id: string) {
  const snap = await collections.virtualLabs().doc(id).get();
  if (!snap.exists) throw new NotFoundError('Virtual lab not found');
  await collections.virtualLabs().doc(id).delete();
  logger.info('Virtual lab deleted', { id });
}

export async function markLabCompleted(studentId: string, labId: string) {
  const labSnap = await collections.virtualLabs().doc(labId).get();
  if (!labSnap.exists) throw new NotFoundError('Virtual lab not found');

  const progressRef = collections.virtualLabProgress()
    .doc(`${studentId}_${labId}`);
  const existing = await progressRef.get();
  if (existing.exists) {
    await progressRef.update({
      completedAt: new Date().toISOString(),
      attempts: FieldValue.increment(1),
    });
  } else {
    await progressRef.set({
      studentId,
      labId,
      completed: true,
      completedAt: new Date().toISOString(),
      attempts: 1,
      score: 100,
    });
  }
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data: concept } = await supabase
      .from('curriculum_hierarchy')
      .select('id')
      .ilike('title', labSnap.data()?.topic)
      .maybeSingle();
    if (concept) {
      try {
        const { computeMastery } = await import('./adaptive/mastery.service');
        computeMastery(studentId, concept.id, 90).catch((err: unknown) =>
          logger.error('Mastery update failed (lab)', { studentId, labId, error: err })
        );
      } catch (_) { /* mastery non-critical */ }

      try {
        const quizSnap = await collections.quizV2()
          .where('conceptId', '==', concept.id)
          .limit(1)
          .get();
        if (!quizSnap.empty) {
          const quizId = quizSnap.docs[0].id;
          await progressRef.update({ quizUnlocked: true, unlockedQuizId: quizId });
        }
      } catch (_) { /* quiz unlock non-critical */ }
    }
  }

  logger.info('Virtual lab completed', { studentId, labId });
  return { completed: true, labId, studentId };
}

export async function getStudentProgress(studentId: string) {
  const snapshot = await collections.virtualLabProgress()
    .where('studentId', '==', studentId)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
