import api from './api';

function mapChildRow(row: any) {
  return {
    ...row,
    displayName: row.display_name,
    studentId: row.student_id,
    rollNo: row.roll_no,
  };
}

export async function getChildren() {
  const res = await api.get('/parent/children');
  return (res.data.data || []).map(mapChildRow);
}

export async function getChildDashboard(studentId: string) {
  const res = await api.get(`/parent/children/${studentId}/dashboard`);
  const data = res.data.data;
  if (data && data.student) {
    return { ...data, student: mapChildRow(data.student) };
  }
  return data;
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

export async function getYearlyReport(studentId: string, academicYear?: string) {
  const params = academicYear ? `?academicYear=${academicYear}` : '';
  const res = await api.get(`/parent/children/${studentId}/yearly-report${params}`);
  return res.data.data;
}
