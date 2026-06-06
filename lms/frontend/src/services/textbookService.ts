import { collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, query, where, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Textbook, Chapter, Concept, GeneratedQuestion, GeneratedAssignment, CachedVideo, ConceptProgress } from '@/types/textbook';

const TEXTBOOKS_COLLECTION = 'textbooks';
const CONCEPT_PROGRESS_COLLECTION = 'conceptProgress';

/** Create a new textbook document in Firestore. Returns the new document id. */
export async function createTextbook(data: Omit<Textbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, TEXTBOOKS_COLLECTION), {
    ...data,
    createdAt: Timestamp.now().toDate().toISOString(),
    updatedAt: Timestamp.now().toDate().toISOString(),
  });
  return docRef.id;
}

/** Update a textbook document's fields. */
export async function updateTextbook(id: string, data: Partial<Textbook>): Promise<void> {
  const docRef = doc(db, TEXTBOOKS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now().toDate().toISOString(),
  });
}

/** Fetch a single textbook by id. Returns null if not found. */
export async function getTextbook(id: string): Promise<Textbook | null> {
  const docRef = doc(db, TEXTBOOKS_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Textbook;
}

/** Fetch all textbooks from Firestore. */
export async function getAllTextbooks(): Promise<Textbook[]> {
  const q = query(collection(db, TEXTBOOKS_COLLECTION));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Textbook));
}

/** Fetch textbooks belonging to a specific subject. */
export async function getTextbooksBySubject(subjectId: string): Promise<Textbook[]> {
  const q = query(collection(db, TEXTBOOKS_COLLECTION), where('subjectId', '==', subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Textbook));
}

/** Delete a textbook document from Firestore. */
export async function deleteTextbook(id: string): Promise<void> {
  await deleteDoc(doc(db, TEXTBOOKS_COLLECTION, id));
}

/** Save chapter data to a textbook document and update its status to 'ready'. */
export async function saveChapters(textbookId: string, chapters: Chapter[]): Promise<void> {
  const textbookRef = doc(db, TEXTBOOKS_COLLECTION, textbookId);
  const snap = await getDoc(textbookRef);
  if (snap.exists()) {
    await updateDoc(textbookRef, {
      chapters,
      status: 'ready',
      processingProgress: 100,
      processingStage: 'Complete',
      updatedAt: Timestamp.now().toDate().toISOString(),
    });
  }
}

/** Save or update concept progress for a user. Creates a new document with defaults if none exists. */
export async function saveConceptProgress(userId: string, conceptId: string, data: Partial<ConceptProgress>): Promise<void> {
  const docRef = doc(db, CONCEPT_PROGRESS_COLLECTION, `${userId}_${conceptId}`);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    await updateDoc(docRef, { ...data, lastAccessed: Timestamp.now().toDate().toISOString() });
  } else {
    await setDoc(docRef, {
      userId,
      conceptId,
      quizScores: [],
      quizAttempts: 0,
      timeSpentMinutes: 0,
      lessonCompleted: false,
      videoCompleted: false,
      questionAccuracy: 0,
      assignmentScores: [],
      masteryPercentage: 0,
      skillLevel: 'beginner',
      lastAccessed: Timestamp.now().toDate().toISOString(),
      ...data,
    });
  }
}

/** Fetch concept progress for a specific user and concept. Returns null if not found. */
export async function getConceptProgress(userId: string, conceptId: string): Promise<ConceptProgress | null> {
  const docRef = doc(db, CONCEPT_PROGRESS_COLLECTION, `${userId}_${conceptId}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as ConceptProgress;
}

/** Fetch all concepts progress for a given user. */
export async function getAllConceptProgress(userId: string): Promise<ConceptProgress[]> {
  const q = query(collection(db, CONCEPT_PROGRESS_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ConceptProgress);
}
