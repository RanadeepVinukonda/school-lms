import { create } from 'zustand';
import { supabase } from '@/supabase/config';
import { extractTextFromPDF } from '@/lib/pdfUtils';
import { extractChapters, generateConceptContentAndQuestions } from '@/services/aiService';
import { searchVideosForConcept } from '@/services/youtubeService';
import { createTextbook, saveChapters } from '@/services/textbookService';
import { getStudentsByClass, createEnrollment } from '@/services/dataService';
import type { Chapter, Concept, GeneratedQuestion, GeneratedAssignment } from '@/types/textbook';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

/** Module-level map of Realtime channels keyed by taskId — keeps non-serializable objects out of Zustand state. */
const realtimeChannels = new Map<string, RealtimeChannel>();

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

/** Prevents parallel processing of the same task. */
const runningTasks = new Set<string>();

/** Subscribe to processing_jobs table for live progress updates. */
function subscribeToJobProgress(taskId: string, textbookId: string): void {
  const channel = supabase
    .channel(`processing_${textbookId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'processing_jobs',
        filter: `textbook_id=eq.${textbookId}`,
      },
      (payload) => {
        const newData = payload.new as Record<string, unknown>;
        if (newData) {
          const progress = (newData.progress as number) ?? 0;
          const currentStep = (newData.current_step as string) || '';
          const status = (newData.status as string) || '';
          
          useUploadStore.setState((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? { ...t, progress: Math.round(progress), log: [...t.log, `Processing: ${currentStep} (${Math.round(progress)}%)`] }
                : t
            ),
          }));

          // Auto-complete when job is done
          if (status === 'completed' || status === 'ready') {
            useUploadStore.setState((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === taskId ? { ...t, stage: 'complete', progress: 100, log: [...t.log, 'Processing complete!'] } : t
              ),
            }));
            supabase.removeChannel(channel);
            realtimeChannels.delete(taskId);
          } else if (status === 'failed') {
            const errorMsg = (newData.error as string) || 'Processing failed';
            useUploadStore.setState((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === taskId ? { ...t, stage: 'error', error: errorMsg, log: [...t.log, `Error: ${errorMsg}`] } : t
              ),
            }));
            supabase.removeChannel(channel);
            realtimeChannels.delete(taskId);
          }
        }
      },
    )
    .subscribe();

  realtimeChannels.set(taskId, channel);
}

async function runProcessing(taskId: string) {
  if (runningTasks.has(taskId)) return;
  runningTasks.add(taskId);

  const store = useUploadStore.getState();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) {
    runningTasks.delete(taskId);
    return;
  }

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
      classId: task.classId || '',
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

    // Subscribe to processing job progress (channel stored in module-level Map, not in Zustand state)
    subscribeToJobProgress(taskId, id);

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
        addLog(`Generating content, questions & assignments for: ${cp.title}`);

        const conceptTitle = cp.title || cp.description || `Concept ${coi + 1}`;
        let summary = cp.description || `Study of ${conceptTitle}`;
        let notes = `Detailed notes for ${conceptTitle}. This concept covers key principles and applications.`;
        let learningObjectives: string[] = [
          `Understand ${conceptTitle}`,
          `Apply ${conceptTitle} concepts`,
          `Analyze problems involving ${conceptTitle}`,
        ];
        let keywords: string[] = [conceptTitle.toLowerCase().replace(/\s+/g, '_')];
        let difficulty: Concept['difficulty'] = 'intermediate';
        let prerequisites: string[] = [];
        let estimatedMinutes = 15;
        let questionBank: GeneratedQuestion[] = [];
        let assignments: Concept['assignments'] = [];

        // Rate limit guard: 10s between AI calls
        await new Promise((r) => setTimeout(r, coi === 0 && ci === 0 ? 0 : 10000));

        try {
          const result = await generateConceptContentAndQuestions(conceptTitle, ch.title, task.subjectName, text);
          if (result) {
            summary = result.summary ?? summary;
            notes = result.notes ?? notes;
            learningObjectives = result.learningObjectives ?? learningObjectives;
            keywords = result.keywords ?? keywords;
            difficulty = result.difficulty ?? difficulty;
            prerequisites = result.prerequisites ?? prerequisites;
            estimatedMinutes = result.estimatedMinutes ?? estimatedMinutes;
          }

          questionBank = (result.questionBank || []).map((q, i) => ({
            id: `${conceptTitle.replace(/\s+/g, '_')}_q_${i}`,
            type: (q.type as GeneratedQuestion['type']) ?? 'mcq',
            difficulty: (q.difficulty as GeneratedQuestion['difficulty']) ?? 'medium',
            category: (q.category as GeneratedQuestion['category']) ?? 'recall',
            text: q.text ?? '',
            options: q.options,
            correctAnswer: q.correctAnswer ?? '',
            explanation: q.explanation ?? '',
            points: q.points ?? 1,
          }));

          assignments = (result.assignments || []).map((a, i) => ({
            id: `${conceptTitle.replace(/\s+/g, '_')}_a_${i}`,
            title: a.title ?? 'Assignment',
            instructions: a.instructions ?? '',
            marks: a.marks ?? 10,
            estimatedMinutes: a.estimatedMinutes ?? 30,
            answerKey: a.answerKey ?? '',
            rubric: a.rubric ?? '',
            type: (a.type as GeneratedAssignment['type']) ?? 'homework',
          }));

          addLog(`Generated ${questionBank.length} questions & ${assignments.length} assignments for: ${cp.title}`);
        } catch (e) {
          addLog(`Content generation failed for ${cp.title}: ${e instanceof Error ? e.message : String(e)}`);
        }

        update({ stage: 'videos' });
        let videos: Concept['videos'] = [];
        try {
          videos = await searchVideosForConcept(task.subjectName, ch.title, cp.title);
          addLog(`Found ${videos.length} videos for: ${cp.title}`);
        } catch (e) {
          addLog(`Video search skipped: ${e instanceof Error ? e.message : String(e)}`);
        }

        concepts.push({
          id: `concept_${id}_ch${ci}_co${coi}`,
          chapterId: `ch_${id}_${ci}`,
          textbookId: id,
          title: conceptTitle,
          summary: summary ?? `Study of ${conceptTitle}`,
          notes: notes ?? `Detailed notes for ${conceptTitle}.`,
          learningObjectives: learningObjectives ?? [`Understand ${conceptTitle}`],
          keywords: keywords ?? [conceptTitle.toLowerCase().replace(/\s+/g, '_')],
          difficulty: difficulty ?? 'intermediate',
          prerequisites: prerequisites ?? [],
          estimatedMinutes: estimatedMinutes ?? 15,
          videos: videos ?? [],
          questionBank: questionBank ?? [],
          assignments: assignments ?? [],
          order: coi,
        });
      }

      chapters.push({
        id: `ch_${id}_${ci}`,
        textbookId: id,
        title: ch.title,
        order: ci,
        description: ch.description ?? '',
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
      } catch (err: unknown) {
        addLog(`Enrollment skipped: ${err instanceof Error ? err.message : String(err)}`);
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
  } finally {
    // Clean up Realtime subscription from module-level map
    const channel = realtimeChannels.get(taskId);
    if (channel) {
      supabase.removeChannel(channel);
      realtimeChannels.delete(taskId);
    }
    runningTasks.delete(taskId);
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
    const channel = realtimeChannels.get(id);
    if (channel) {
      supabase.removeChannel(channel);
      realtimeChannels.delete(id);
    }
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  retryTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const channel = realtimeChannels.get(id);
    if (channel) {
      supabase.removeChannel(channel);
      realtimeChannels.delete(id);
    }
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
