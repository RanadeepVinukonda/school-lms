import api from './api';
import type { ApiResponse } from '@/types';
import type { MindMap, MindMapNode, MindMapEdge } from '@/types/mindmap';

export const mindmapService = {
  async generate(text: string, title: string, language?: string) {
    const res = await api.post<ApiResponse<MindMap>>('/mindmaps/generate', { text, title, language });
    return res.data.data;
  },
  async create(title: string, description?: string) {
    const res = await api.post<ApiResponse<MindMap>>('/mindmaps', { title, description });
    return res.data.data;
  },

  async getById(id: string) {
    const res = await api.get<ApiResponse<MindMap>>(`/mindmaps/${id}`);
    return res.data.data;
  },

  async update(id: string, data: Partial<Pick<MindMap, 'title' | 'description' | 'nodes' | 'edges'>>) {
    const res = await api.put<ApiResponse<MindMap>>(`/mindmaps/${id}`, data);
    return res.data.data;
  },

  async delete(id: string) {
    await api.delete(`/mindmaps/${id}`);
  },

  async removeShared(id: string) {
    await api.delete(`/mindmaps/${id}/remove-share`);
  },

  async getUserMindMaps() {
    const res = await api.get<ApiResponse<MindMap[]>>('/mindmaps/user');
    return res.data.data;
  },

  async getSharedMindMaps() {
    const res = await api.get<ApiResponse<MindMap[]>>('/mindmaps/shared');
    return res.data.data;
  },

  async share(id: string, shareWithIds: string[]) {
    const res = await api.post<ApiResponse<MindMap>>(`/mindmaps/${id}/share`, { shareWithIds });
    return res.data.data;
  },

  async pushToClasses(id: string, classIds: string[], subjectId?: string, subjectName?: string) {
    const res = await api.post<ApiResponse<MindMap>>(`/mindmaps/${id}/push-to-classes`, { classIds, subjectId, subjectName });
    return res.data.data;
  },

  async pinResource(id: string, nodeId: string, resourceId: string, resourceType: 'lesson' | 'concept' | 'video') {
    const res = await api.post<ApiResponse<MindMap>>(`/mindmaps/${id}/pin-resource`, { nodeId, resourceId, resourceType });
    return res.data.data;
  },
};
