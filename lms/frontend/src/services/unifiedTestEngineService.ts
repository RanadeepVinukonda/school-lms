import api from './api';

export const unifiedTestEngineService = {
  createTest: (data: Record<string, unknown>) =>
    api.post('/unified-test-engine/create', data).then((r) => r.data.data),

  previewTest: (data: Record<string, unknown>) =>
    api.post('/unified-test-engine/preview', data).then((r) => r.data.data),

  getTest: (testId: string) =>
    api.get(`/unified-test-engine/${testId}`).then((r) => r.data.data),

  updateTest: (testId: string, data: Record<string, unknown>) =>
    api.patch(`/unified-test-engine/${testId}`, data).then((r) => r.data.data),

  deleteTest: (testId: string) =>
    api.delete(`/unified-test-engine/${testId}`).then((r) => r.data.data),

  listForClass: (classId: string) =>
    api.get(`/unified-test-engine/class/${classId}`).then((r) => r.data.data ?? []),

  listMyTests: () =>
    api.get('/unified-test-engine/my').then((r) => r.data.data ?? []),

  republish: (testId: string) =>
    api.post(`/unified-test-engine/${testId}/republish`).then((r) => r.data.data),

  startAttempt: (testId: string) =>
    api.post(`/unified-test-engine/${testId}/start`).then((r) => r.data.data),

  submitAttempt: (attemptId: string, data: Record<string, unknown>) =>
    api.post(`/unified-test-engine/attempts/${attemptId}/submit`, data).then((r) => r.data.data),

  getResults: (testId: string) =>
    api.get(`/unified-test-engine/${testId}/results`).then((r) => r.data.data),

  releaseResults: (testId: string, showResults: boolean) =>
    api.put(`/unified-test-engine/${testId}/results`, { showResults }).then((r) => r.data.data),

  getMyAttempts: () =>
    api.get('/unified-test-engine/attempts/my').then((r) => r.data.data ?? []),

  getStudentAttempts: (studentId: string) =>
    api.get(`/unified-test-engine/attempts/student/${studentId}`).then((r) => r.data.data ?? []),

  getClassAttempts: (classId: string) =>
    api.get(`/unified-test-engine/class/${classId}/attempts`).then((r) => r.data.data ?? []),

  getTemplates: () =>
    api.get('/unified-test-engine/templates/my').then((r) => r.data.data ?? []),

  createTemplate: (data: Record<string, unknown>) =>
    api.post('/unified-test-engine/templates', data).then((r) => r.data.data),

  updateTemplate: (templateId: string, data: Record<string, unknown>) =>
    api.put(`/unified-test-engine/templates/${templateId}`, data).then((r) => r.data.data),

  deleteTemplate: (templateId: string) =>
    api.delete(`/unified-test-engine/templates/${templateId}`).then((r) => r.data.data),
};
