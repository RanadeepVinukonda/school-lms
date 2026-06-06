import { create } from 'zustand';
import { extractTextFromPDF } from '@/lib/pdfUtils';
import { extractChapters, generateConceptContent, generateQuestionBank } from '@/services/aiService';
import { searchVideosForConcept } from '@/services/youtubeService';
import { createTextbook, saveChapters } from '@/services/textbookService';
import { getStudentsByClass, createEnrollment } from '@/services/dataService';
import type { Chapter, Concept, CachedVideo, GeneratedQuestion } from '@/types/textbook';

export type UploadStage =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'analyzing'
  | 'generating'
  | 'videos'
  | 'questions'
  | 'saving'
  | 'complete'
  | 'error';

export interface UploadTask {
  id: string;
  file: File;
  subjectId: string;
  subjectName: string;
  classId: string | null;
  stage: UploadStage;
  progress: number;
  textbookId: string | null;
  log: string[];
  error: string | null;
}

interface UploadStore {
  tasks: UploadTask[];
  startUpload: (file: File, subjectId: string, subjectName: string, classId?: string) => string;
  removeTask: (id: string) => void;
  retryTask: (id: string) => void;
}

const stageLabels: Record<UploadStage, string> = {
  idle: 'Ready',
  uploading: 'Uploading...',
  extracting: 'Extracting text from PDF...',
  analyzing: 'AI is analyzing structure...',
  generating: 'Generating concept content...',
  videos: 'Searching for educational videos...',
  questions: 'Generating question banks...',
  saving: 'Saving to database...',
  complete: 'Complete!',
  error: 'Error',
};

export const stageLabel = (s: UploadStage) => stageLabels[s];

function makeId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function runProcessing(taskId: string) {
  const store = useUploadStore.getState();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return;

  const update = (partial: Partial<UploadTask>) => {
    useUploadStore.setState((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...partial } : t)),
    }));
  };

  const addLog = (msg: string) => {
    useUploadStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, log: [...t.log, msg] } : t
      ),
    }));
  };

  try {
    update({ stage: 'uploading', progress: 5 });
    addLog('Starting textbook processing...');

    const initialTextbook = {
      subjectId: task.subjectId || 'custom',
      title: task.file.name.replace('.pdf', ''),
      chapters: [],
      status: 'processing' as const,
      processingProgress: 0,
      processingStage: 'Starting...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const id = await createTextbook(initialTextbook);
    update({ textbookId: id });
    addLog(`Textbook created with ID: ${id}`);

    update({ stage: 'extracting', progress: 15 });
    addLog('Extracting text from PDF...');
    const text = await extractTextFromPDF(task.file);
    addLog(`Extracted ${text.length} characters from PDF`);

    if (text.length < 50) {
      throw new Error('Could not extract enough text from the PDF. The file may be scanned images or empty.');
    }

    update({ stage: 'analyzing', progress: 25 });
    addLog('AI is analyzing textbook structure...');
    const structure = await extractChapters(text, task.subjectName);
    addLog(`Found ${structure.chapters.length} chapters`);

    const chapters: Chapter[] = [];

    for (let ci = 0; ci < structure.chapters.length; ci++) {
      const ch = structure.chapters[ci];
      const concepts: Concept[] = [];

      for (let coi = 0; coi < ch.concepts.length; coi++) {
        const cp = ch.concepts[coi];
        const totalConcepts = structure.chapters.reduce((s, c) => s + c.concepts.length, 0);
        const conceptProgress = ((ci * ch.concepts.length + coi + 1) / totalConcepts) * 100;
        const stagePct = 25 + conceptProgress * 0.5;
        update({ stage: 'generating', progress: Math.min(Math.round(stagePct), 75) });
        addLog(`Generating content for concept: ${cp.title}`);

        let content: Awaited<ReturnType<typeof generateConceptContent>>;
        try {
          content = await generateConceptContent(cp.title, ch.title, task.subjectName, text);
        } catch {
          content = {
            summary: cp.description || `Study of ${cp.title}`,
            notes: `Detailed notes for ${cp.title}. This concept covers key principles and applications.`,
            learningObjectives: [
              `Understand ${cp.title}`,
              `Apply ${cp.title} concepts`,
              `Analyze problems involving ${cp.title}`,
            ],
            keywords: [cp.title.toLowerCase().replace(/\s+/g, '_')],
            difficulty: 'intermediate' as const,
            prerequisites: [],
            estimatedMinutes: 15,
          };
        }

        update({ stage: 'videos' });
        let videos: CachedVideo[] = [];
        try {
          videos = await searchVideosForConcept(task.subjectName, ch.title, cp.title);
          addLog(`Found ${videos.length} videos for: ${cp.title}`);
        } catch {
          addLog('Video search skipped');
        }

        update({ stage: 'questions' });
        let questionBank: GeneratedQuestion[] = [];
        try {
          const qb = await generateQuestionBank(cp.title, ch.title, task.subjectName);
          const allQuestions: GeneratedQuestion[] = [];

          [...(qb.easy || [])].forEach((q, i) => {
            allQuestions.push({
              id: `${cp.title.replace(/\s+/g, '_')}_easy_${i}`,
              type: q.type as GeneratedQuestion['type'],
              difficulty: 'easy',
              category: 'recall',
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: 1,
            });
          });

          [...(qb.medium || [])].forEach((q, i) => {
            allQuestions.push({
              id: `${cp.title.replace(/\s+/g, '_')}_medium_${i}`,
              type: q.type as GeneratedQuestion['type'],
              difficulty: 'medium',
              category: 'application',
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: 2,
            });
          });

          [...(qb.hard || [])].forEach((q, i) => {
            allQuestions.push({
              id: `${cp.title.replace(/\s+/g, '_')}_hard_${i}`,
              type: q.type as GeneratedQuestion['type'],
              difficulty: 'hard',
              category: 'critical_thinking',
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: 3,
            });
          });

          [...(qb.application || [])].forEach((q, i) => {
            allQuestions.push({
              id: `${cp.title.replace(/\s+/g, '_')}_app_${i}`,
              type: q.type as GeneratedQuestion['type'],
              difficulty: 'medium',
              category: 'application',
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              points: 2,
            });
          });

          questionBank = allQuestions;
          addLog(`Generated ${allQuestions.length} questions for: ${cp.title}`);
        } catch {
          addLog('Question generation skipped for: ' + cp.title);
        }

        concepts.push({
          id: `concept_${id}_ch${ci}_co${coi}`,
          chapterId: `ch_${id}_${ci}`,
          textbookId: id,
          title: cp.title,
          summary: content.summary,
          notes: content.notes,
          learningObjectives: content.learningObjectives,
          keywords: content.keywords,
          difficulty: content.difficulty,
          prerequisites: content.prerequisites,
          estimatedMinutes: content.estimatedMinutes,
          videos,
          questionBank,
          assignments: [],
          order: coi,
        });
      }

      chapters.push({
        id: `ch_${id}_${ci}`,
        textbookId: id,
        title: ch.title,
        order: ci,
        description: ch.description,
        concepts,
      });
    }

    update({ stage: 'saving', progress: 90 });
    addLog('Saving all content to database...');
    await saveChapters(id, chapters);

    // Auto-enroll students in the class
    if (task.classId && task.subjectId) {
      addLog('Enrolling students from class...');
      try {
        const students = await getStudentsByClass(task.classId);
        for (const student of students) {
          await createEnrollment(student.id, task.subjectId);
        }
        addLog(`Enrolled ${students.length} students from class into subject`);
      } catch (err: any) {
        addLog(`Enrollment skipped: ${err.message}`);
      }
    }

    update({ progress: 100, stage: 'complete' });
    addLog('Textbook processing complete!');
  } catch (err) {
    update({
      stage: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  tasks: [],

  startUpload: (file, subjectId, subjectName, classId) => {
    const id = makeId();
    set((s) => ({
      tasks: [
        ...s.tasks,
        { id, file, subjectId, subjectName, classId: classId || null, stage: 'idle', progress: 0, textbookId: null, log: [], error: null },
      ],
    }));
    runProcessing(id);
    return id;
  },

  removeTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  retryTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, stage: 'idle' as const, progress: 0, log: [], error: null }
          : t
      ),
    }));
    runProcessing(id);
  },
}));
