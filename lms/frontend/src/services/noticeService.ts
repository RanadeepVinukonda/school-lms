import api from './api';
import type { ApiResponse } from '@/types';

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority?: string;
  created_by?: string;
  created_at: string;
  expires_at?: string;
}

export const noticeService = {
  async getNotices() {
    const response = await api.get<ApiResponse<Notice[]>>('/notices');
    return response.data;
  },

  async createNotice(data: { title: string; content: string; priority?: string; expires_at?: string }) {
    const response = await api.post<ApiResponse<Notice>>('/notices', data);
    return response.data;
  },

  async deleteNotice(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/notices/${id}`);
    return response.data;
  },
};
