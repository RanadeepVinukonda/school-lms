import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/pdfUtils', () => ({
  extractTextFromPDF: vi.fn().mockResolvedValue('mock extracted text'),
}));

vi.mock('@/services/aiService', () => ({
  extractChapters: vi.fn().mockResolvedValue({ title: 'Test', chapters: [] }),
  generateConceptContent: vi.fn().mockResolvedValue({
    summary: 'test', notes: '', learningObjectives: [], keywords: [],
    difficulty: 'intermediate', prerequisites: [], estimatedMinutes: 15,
  }),
  generateQuestionBank: vi.fn().mockResolvedValue({ easy: [], medium: [], hard: [], application: [] }),
}));

vi.mock('@/services/youtubeService', () => ({
  searchVideosForConcept: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/textbookService', () => ({
  createTextbook: vi.fn().mockResolvedValue('tb_1'),
  saveChapters: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/dataService', () => ({
  getStudentsByClass: vi.fn().mockResolvedValue([]),
  createEnrollment: vi.fn().mockResolvedValue(undefined),
}));

describe('uploadStore', () => {
  beforeEach(async () => {
    const { useUploadStore } = await import('@/store/uploadStore');
    useUploadStore.setState({ tasks: [] });
  });

  it('starts with empty tasks', async () => {
    const { useUploadStore } = await import('@/store/uploadStore');
    expect(useUploadStore.getState().tasks).toEqual([]);
  });

  it('adds a task on startUpload', async () => {
    const { useUploadStore } = await import('@/store/uploadStore');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const id = useUploadStore.getState().startUpload(file, 'sub1', 'Math');
    const task = useUploadStore.getState().tasks.find((t) => t.id === id);
    expect(task).toBeDefined();
    expect(task!.file.name).toBe('test.pdf');
    expect(task!.subjectId).toBe('sub1');
    expect(task!.subjectName).toBe('Math');
  });

  it('accepts optional classId', async () => {
    const { useUploadStore } = await import('@/store/uploadStore');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const id = useUploadStore.getState().startUpload(file, 'sub1', 'Math', 'c1');
    const task = useUploadStore.getState().tasks.find((t) => t.id === id);
    expect(task!.classId).toBe('c1');
  });

  it('defaults classId to null', async () => {
    const { useUploadStore } = await import('@/store/uploadStore');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const id = useUploadStore.getState().startUpload(file, 'sub1', 'Math');
    const task = useUploadStore.getState().tasks.find((t) => t.id === id);
    expect(task!.classId).toBeNull();
  });

  it('removes a task by id', async () => {
    const { useUploadStore } = await import('@/store/uploadStore');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const id = useUploadStore.getState().startUpload(file, 'sub1', 'Math');
    expect(useUploadStore.getState().tasks).toHaveLength(1);
    useUploadStore.getState().removeTask(id);
    expect(useUploadStore.getState().tasks).toHaveLength(0);
  });
});
