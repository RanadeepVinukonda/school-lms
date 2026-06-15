import api from './api';

export async function getChildren() {
  const res = await api.get('/parent/children');
  return res.data.data;
}

export async function getChildDashboard(studentId: string) {
  const res = await api.get(`/parent/children/${studentId}/dashboard`);
  return res.data.data;
}

export async function getChildProgress(studentId: string) {
  const res = await api.get(`/parent/children/${studentId}/progress`);
  return res.data.data;
}

export async function getChildReport(studentId: string) {
  const res = await api.get(`/parent/children/${studentId}/report`);
  return res.data.data;
}

export async function getRecommendations() {
  const res = await api.get('/parent/recommendations');
  return res.data.data;
}
