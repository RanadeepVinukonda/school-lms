import api from './api';
import type { ApiResponse } from '@/types';
import type { CodingProject, StreamProject, CodeExecutionResult } from '@/types/coding';

export const codingService = {
  async getAllProjects() {
    const res = await api.get<ApiResponse<CodingProject[]>>('/coding/projects');
    return res.data.data;
  },

  async getProjectById(id: string) {
    const res = await api.get<ApiResponse<CodingProject>>(`/coding/projects/${id}`);
    return res.data.data;
  },

  async createProject(data: Partial<CodingProject>) {
    const res = await api.post<ApiResponse<CodingProject>>('/coding/projects', data);
    return res.data.data;
  },

  async updateProject(id: string, data: Partial<CodingProject>) {
    const res = await api.put<ApiResponse<CodingProject>>(`/coding/projects/${id}`, data);
    return res.data.data;
  },

  async deleteProject(id: string) {
    await api.delete(`/coding/projects/${id}`);
  },

  async executeCode(code: string, language: string) {
    const res = await api.post<ApiResponse<CodeExecutionResult>>('/coding/execute', { code, language });
    return res.data.data;
  },

  async getAllStreamProjects() {
    const res = await api.get<ApiResponse<StreamProject[]>>('/coding/stream-projects');
    return res.data.data;
  },
};
