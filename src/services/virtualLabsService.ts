import api from './api';
import type { ApiResponse } from '@/types';
import type { VirtualLab, LabProgress } from '@/types/virtualLab';

export const virtualLabsService = {
  async getAll() {
    const res = await api.get<ApiResponse<VirtualLab[]>>('/virtual-labs');
    return res.data.data;
  },

  async getById(id: string) {
    const res = await api.get<ApiResponse<VirtualLab>>(`/virtual-labs/${id}`);
    return res.data.data;
  },

  async create(data: Partial<VirtualLab>) {
    const res = await api.post<ApiResponse<VirtualLab>>('/virtual-labs', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<VirtualLab>) {
    const res = await api.put<ApiResponse<VirtualLab>>(`/virtual-labs/${id}`, data);
    return res.data.data;
  },

  async delete(id: string) {
    await api.delete(`/virtual-labs/${id}`);
  },

  async markComplete(labId: string) {
    const res = await api.post<ApiResponse<{ completed: boolean; labId: string; studentId: string }>>(`/virtual-labs/${labId}/complete`);
    return res.data.data;
  },

  async getProgress(studentId: string) {
    const res = await api.get<ApiResponse<LabProgress[]>>(`/virtual-labs/progress/${studentId}`);
    return res.data.data;
  },
};
