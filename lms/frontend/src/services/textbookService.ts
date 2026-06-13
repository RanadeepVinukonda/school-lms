import { collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, query, where, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { logAudit } from '@/services/auditService';
import type { Textbook, Chapter, Concept, GeneratedQuestion, GeneratedAssignment, CachedVideo, ConceptProgress, ConceptRelease } from '@/types/textbook';

const TEXTBOOKS_COLLECTION = 'textbooks';
const CHAPTERS_COLLECTION = 'chapters';
const CONCEPTS_COLLECTION = 'concepts';
const CONCEPT_PROGRESS_COLLECTION = 'conceptProgress';
const CONCEPT_RELEASES_COLLECTION = 'conceptReleases';

/** Create a new textbook document in Firestore. Returns the new document id. */
export async function createTextbook(data: Omit<Textbook, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, TEXTBOOKS_COLLECTION), {
    ...data,
    createdAt: Timestamp.now().toDate().toISOString(),
    updatedAt: Timestamp.now().toDate().toISOString(),
  });
  logAudit({
    action: 'textbook.create',
    targetId: docRef.id,
    targetType: 'textbook',
    targetName: data.title || 'Untitled',
    summary: `Created textbook "${data.title || 'Untitled'}" for subject ${data.subjectId}`,
    newValue: { ...data },
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
  logAudit({
    action: 'textbook.update',
    targetId: id,
    targetType: 'textbook',
    targetName: data.title || id,
    summary: `Updated textbook "${data.title || id}"`,
    newValue: data,
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
  logAudit({
    action: 'textbook.delete',
    targetId: id,
    targetType: 'textbook',
    targetName: id,
    summary: `Deleted textbook ${id}`,
  });
}

/** Save chapter data to a textbook: creates subcollection documents for each chapter and concept. */
export async function saveChapters(textbookId: string, chapters: Chapter[]): Promise<void> {
  const textbookRef = doc(db, TEXTBOOKS_COLLECTION, textbookId);
  const snap = await getDoc(textbookRef);
  if (!snap.exists()) return;

  const chaptersCollectionRef = collection(db, TEXTBOOKS_COLLECTION, textbookId, CHAPTERS_COLLECTION);

  for (const chapter of chapters) {
    const { concepts, ...chapterData } = chapter;
    const chapterRef = doc(chaptersCollectionRef, chapter.id);
    await setDoc(chapterRef, {
      ...chapterData,
      textbookId,
      chapterCount: concepts.length,
      createdAt: Timestamp.now().toDate().toISOString(),
    });

    const conceptsCollectionRef = collection(db, TEXTBOOKS_COLLECTION, textbookId, CHAPTERS_COLLECTION, chapter.id, CONCEPTS_COLLECTION);
    for (const concept of concepts) {
      const { questionBank, ...conceptData } = concept;
      const conceptRef = doc(conceptsCollectionRef, concept.id);
      await setDoc(conceptRef, {
        ...conceptData,
        textbookId,
        chapterId: chapter.id,
        createdAt: Timestamp.now().toDate().toISOString(),
      });

      if (Array.isArray(questionBank)) {
        const questionsCollectionRef = collection(conceptRef, 'questions');
        for (const q of questionBank) {
          await setDoc(doc(questionsCollectionRef, q.id), q);
        }
      }
    }
  }

  await updateDoc(textbookRef, {
    chapterCount: chapters.length,
    status: 'ready',
    processingProgress: 100,
    processingStage: 'Complete',
    updatedAt: Timestamp.now().toDate().toISOString(),
  });

  logAudit({
    action: 'textbook.chapters.save',
    targetId: textbookId,
    targetType: 'textbook',
    targetName: textbookId,
    summary: `Saved ${chapters.length} chapters to textbook ${textbookId} and marked as ready`,
    newValue: { chapterCount: chapters.length, status: 'ready' },
  });
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

/** Fetch all concept releases for a textbook and class. */
export async function getAllConceptReleases(classId: string, textbookId: string): Promise<ConceptRelease[]> {
  const q = query(
    collection(db, CONCEPT_RELEASES_COLLECTION),
    where('classId', '==', classId),
    where('textbookId', '==', textbookId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ConceptRelease);
}

/** Fetch the release status for a concept. Returns default (all false) if not found. */
export async function getConceptRelease(classId: string, textbookId: string, conceptId: string): Promise<ConceptRelease | null> {
  const docRef = doc(db, CONCEPT_RELEASES_COLLECTION, `${classId}_${textbookId}_${conceptId}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ConceptRelease;
}

/** Fetch all chapters in a textbook, ordered by chapter order. */
export async function getChaptersForTextbook(textbookId: string): Promise<Chapter[]> {
  const q = query(
    collection(db, TEXTBOOKS_COLLECTION, textbookId, CHAPTERS_COLLECTION),
    orderBy('order'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Chapter));
}

/** Fetch all concepts in a chapter, ordered by concept order. */
export async function getConceptsForChapter(textbookId: string, chapterId: string): Promise<Concept[]> {
  const q = query(
    collection(db, TEXTBOOKS_COLLECTION, textbookId, CHAPTERS_COLLECTION, chapterId, CONCEPTS_COLLECTION),
    orderBy('order'),
  );
  const snap = await getDocs(q);
  const concepts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Concept));

  for (const concept of concepts) {
    const qSnap = await getDocs(
      collection(db, TEXTBOOKS_COLLECTION, textbookId, CHAPTERS_COLLECTION, chapterId, CONCEPTS_COLLECTION, concept.id, 'questions')
    );
    concept.questionBank = qSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as GeneratedQuestion));
  }
  return concepts;
}

/** Set or update concept release status (which content is pushed to students). */
export async function setConceptRelease(
  classId: string,
  textbookId: string,
  conceptId: string,
  chapterId: string,
  teacherId: string,
  data: Partial<Pick<ConceptRelease, 'questionBankReleased' | 'assignmentsReleased' | 'mindMapReleased'>>,
): Promise<void> {
  const docRef = doc(db, CONCEPT_RELEASES_COLLECTION, `${classId}_${textbookId}_${conceptId}`);
  const snap = await getDoc(docRef);
  const payload = {
    classId,
    textbookId,
    chapterId,
    conceptId,
    teacherId,
    ...data,
    updatedAt: Timestamp.now().toDate().toISOString(),
  };
  if (snap.exists()) {
    await updateDoc(docRef, payload);
  } else {
    await setDoc(docRef, {
      ...payload,
      questionBankReleased: false,
      assignmentsReleased: false,
      mindMapReleased: false,
      ...data,
    });
  }
  logAudit({
    action: 'concept.release',
    targetId: `${classId}_${textbookId}_${conceptId}`,
    targetType: 'conceptRelease',
    targetName: `Concept ${conceptId}`,
    summary: `Updated release settings for concept ${conceptId} in textbook ${textbookId} for class ${classId}`,
    newValue: data,
  });
}
