import api from './api';

export const contentPublishingService = {
  publish: (data: Record<string, unknown>) =>
    api.post('/content-publishing', data).then((r) => r.data.data),

  unpublish: (publishId: string) =>
    api.delete(`/content-publishing/${publishId}`).then((r) => r.data.data),

  getPublished: (classId: string, contentType?: string) =>
    api.get(`/content-publishing/${classId}`, {
      params: contentType ? { contentType } : {},
    }).then((r) => r.data.data ?? []),

  getMyContent: () =>
    api.get('/content-publishing/my').then((r) => r.data.data ?? []),

  getStats: () =>
    api.get('/content-publishing/stats').then((r) => r.data.data),
};
