import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';

/** Create a textbook. Enforces:
 *  - Rule 2: One textbook per (class × subject)
 *  - Rule 3: Teacher can only upload for their assigned subject+class
 */
export async function createTextbook(data: {
  title: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  description?: string;
  coverImage?: string;
}) {
  // Rule 3: Verify the teacher is assigned to this class+subject
  const assignmentSnap = await collections.teacherClassSubject()
    .where('teacherId', '==', data.teacherId)
    .where('classId', '==', data.classId)
    .where('subjectId', '==', data.subjectId)
    .limit(1)
    .get();

  if (assignmentSnap.empty) {
    throw new ForbiddenError('You are not assigned to teach this subject in this class');
  }
  const assignment = { id: assignmentSnap.docs[0].id, ...assignmentSnap.docs[0].data() } as any;

  // Rule 2: Check if a textbook already exists for this class+subject
  const existing = await collections.textbooks()
    .where('classId', '==', data.classId)
    .where('subjectId', '==', data.subjectId)
    .get();

  if (!existing.empty) {
    throw new ConflictError('A textbook already exists for this class and subject. Remove it first to upload a new one.');
  }

  const textbookId = uuidv4();
  const now = new Date().toISOString();

  const titleLower = data.title.toLowerCase();
  let chapDetails: Array<{ title: string; concepts: string[] }> = [];

  if (titleLower.includes('math') || titleLower.includes('alg') || titleLower.includes('calc') || titleLower.includes('geom')) {
    chapDetails = [
      {
        title: 'Chapter 1: Quadratic Equations & Functions',
        concepts: ['Factoring Quadratic Polynomials', 'Applying the Quadratic Formula']
      },
      {
        title: 'Chapter 2: Trigonometric Principles',
        concepts: ['Trigonometric Ratios & Angles', 'Laws of Sines and Cosines']
      }
    ];
  } else if (titleLower.includes('science') || titleLower.includes('phys') || titleLower.includes('chem') || titleLower.includes('bio')) {
    chapDetails = [
      {
        title: 'Chapter 1: Laws of Classical Mechanics',
        concepts: ['Newtonian Laws of Motion', 'Conservation of Momentum']
      },
      {
        title: 'Chapter 2: Thermodynamics & Heat Transfer',
        concepts: ['First Law of Thermodynamics', 'Conduction, Convection, and Radiation']
      }
    ];
  } else {
    chapDetails = [
      {
        title: 'Chapter 1: Foundations of the Discipline',
        concepts: ['Introduction & Core Concepts', 'Historical Overview & Context']
      },
      {
        title: 'Chapter 2: Advanced Methodology',
        concepts: ['Analytical Frameworks', 'Practical Applications & Case Studies']
      }
    ];
  }

  const textbookData = {
    id: textbookId,
    title: data.title,
    subjectId: data.subjectId,
    classId: data.classId,
    teacherId: data.teacherId,
    description: data.description || '',
    coverImage: data.coverImage || '',
    status: 'ready',
    chapterCount: chapDetails.length,
    createdAt: now,
    updatedAt: now,
  };

  await collections.textbooks().doc(textbookId).set(textbookData);

  // Populate Chapters and Concepts with Question Banks
  for (let cIdx = 0; cIdx < chapDetails.length; cIdx++) {
    const chapInfo = chapDetails[cIdx];
    const chapId = uuidv4();
    const chapRef = collections.textbooks().doc(textbookId).collection('chapters').doc(chapId);
    
    await chapRef.set({
      id: chapId,
      title: chapInfo.title,
      order: cIdx + 1,
      summary: `Comprehensive coverage of ${chapInfo.title.substring(chapInfo.title.indexOf(':') + 1).trim()}`
    });

    for (let coIdx = 0; coIdx < chapInfo.concepts.length; coIdx++) {
      const conceptTitle = chapInfo.concepts[coIdx];
      const conceptId = uuidv4();
      const conceptRef = chapRef.collection('concepts').doc(conceptId);

      const generatedQuestions = [
        {
          id: uuidv4(),
          conceptId,
          type: 'mcq',
          difficulty: 'easy',
          text: `Which of the following is a fundamental concept related to ${conceptTitle}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A',
          explanation: 'Option A is the basic foundation of this concept.',
          points: 5
        },
        {
          id: uuidv4(),
          conceptId,
          type: 'mcq',
          difficulty: 'medium',
          text: `Under standard conditions, how does ${conceptTitle} behave when subject to change?`,
          options: ['It increases', 'It decreases', 'It remains constant', 'It fluctuates'],
          correctAnswer: 'It remains constant',
          explanation: 'According to the core theory of this concept, it remains constant.',
          points: 5
        },
        {
          id: uuidv4(),
          conceptId,
          type: 'true_false',
          difficulty: 'easy',
          text: `Is the primary theorem of ${conceptTitle} universally accepted under ideal conditions?`,
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Yes, it is widely accepted as a fundamental law.',
          points: 2
        },
        {
          id: uuidv4(),
          conceptId,
          type: 'fill_blank',
          difficulty: 'medium',
          text: `The core mechanism of ${conceptTitle} is based on the principle of ____________.`,
          correctAnswer: 'conservation',
          explanation: 'Conservation is the central principle of this topic.',
          points: 5
        },
        {
          id: uuidv4(),
          conceptId,
          type: 'numerical',
          difficulty: 'hard',
          text: `Calculate the net effect coefficient for ${conceptTitle} when the input variable is set to 42.`,
          correctAnswer: '84',
          explanation: 'The formula is 2 * input = 2 * 42 = 84.',
          points: 10
        },
        {
          id: uuidv4(),
          conceptId,
          type: 'matching',
          difficulty: 'medium',
          text: `Match the terms below with their correct definitions for ${conceptTitle}.`,
          options: ['Term A - Definition 1', 'Term B - Definition 2', 'Term C - Definition 3'],
          correctAnswer: 'Term A:Definition 1|Term B:Definition 2|Term C:Definition 3',
          explanation: 'Terms are matched in sequential order.',
          points: 8
        },
        {
          id: uuidv4(),
          conceptId,
          type: 'descriptive',
          difficulty: 'hots',
          text: `Critically analyze the long-term implications of applying ${conceptTitle} to complex real-world scenarios.`,
          correctAnswer: 'Student should explain the systemic feedback loops, edge cases, and optimization strategies.',
          explanation: 'Grading is descriptive based on key points: feedback loops, edge cases, optimization.',
          points: 15
        },
        {
          id: uuidv4(),
          conceptId,
          type: 'passage',
          difficulty: 'hots',
          text: `Based on the passage above, what is the most logical conclusion regarding ${conceptTitle}?`,
          passageText: `Recent research on ${conceptTitle} indicates a major paradigm shift. Historically, it was viewed as static. However, new dynamic models suggest a highly interactive system.`,
          options: ['It is static', 'It is dynamic', 'It is irrelevant', 'It is non-interactive'],
          correctAnswer: 'It is dynamic',
          explanation: 'The passage explicitly states that new dynamic models suggest a highly interactive system.',
          points: 10
        }
      ];

      await conceptRef.set({
        id: conceptId,
        title: conceptTitle,
        order: coIdx + 1,
        notes: `Study notes detailing the key rules, theoretical applications, and core principles governing ${conceptTitle}.`,
        videoLinks: [
          `https://www.youtube.com/watch?v=mock_video_1_${conceptId.substring(0, 4)}`,
          `https://www.youtube.com/watch?v=mock_video_2_${conceptId.substring(0, 4)}`
        ],
        learningObjectives: [
          `Understand the fundamentals of ${conceptTitle}`,
          `Apply ${conceptTitle} principles to solve practical problems`
        ],
        keywords: [
          conceptTitle.toLowerCase().replace(/\s+/g, '_'),
          'theory',
          'application'
        ],
        questionBank: generatedQuestions
      });
    }
  }

  // Update the teacher-class-subject record with textbookId
  if (assignment.id) {
    await collections.teacherClassSubject().doc(assignment.id).update({
      textbookId,
      updatedAt: now,
    });
  }

  logger.info('Textbook created with mock chapters, concepts and questions', { textbookId, title: data.title, classId: data.classId, subjectId: data.subjectId });

  return textbookData;
}

/** Get textbooks for a class+subject. */
export async function getTextbooksByClassAndSubject(classId: string, subjectId: string) {
  const snap = await collections.textbooks()
    .where('classId', '==', classId)
    .where('subjectId', '==', subjectId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** List all textbooks (no filter) */
export async function listAllTextbooks() {
  const snap = await collections.textbooks().get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Get a single textbook. */
export async function getTextbookById(textbookId: string) {
  const doc = await collections.textbooks().doc(textbookId).get();
  if (!doc.exists) throw new NotFoundError('Textbook not found');
  return { id: doc.id, ...doc.data() };
}

/** Get chapters for a textbook */
export async function getChapters(textbookId: string) {
  const snap = await collections.textbooks().doc(textbookId).collection('chapters').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Get concepts for a chapter of a textbook */
export async function getConcepts(textbookId: string, chapterId: string) {
  const snap = await collections.textbooks()
    .doc(textbookId)
    .collection('chapters')
    .doc(chapterId)
    .collection('concepts')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Delete a textbook. */
export async function deleteTextbook(textbookId: string) {
  const ref = collections.textbooks().doc(textbookId);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Textbook not found');
  await ref.delete();
  logger.info('Textbook deleted', { textbookId });
}
