import api from '@/services/api';

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/upload/avatar', formData, { timeout: 60000 });
  return res.data.data.url;
}
