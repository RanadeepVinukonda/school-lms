import { collections, QuerySnap } from '../database/adapter';
import { getAdminDashboard } from './analytics.service';

function docsToArray(snapshot: QuerySnap): any[] {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function schoolFilter(q: any, schoolId?: string) {
  return schoolId ? q.where('schoolId', '==', schoolId) : q;
}

export async function getGradeComparison(schoolId?: string) {
  const users = docsToArray(await schoolFilter(collections.users(), schoolId).get());
  const classes = docsToArray(await schoolFilter(collections.classes(), schoolId).get());
  const grades = docsToArray(await collections.grades().get());

  const gradeMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  for (const g of grades) {
    const student = users.find((u) => u.id === g.studentId);
    if (!student) continue;
    const cls = classes.find((c) => c.id === student.classId || (student.classIds && student.classIds.includes(c.id)));
    const gradeKey = cls?.grade || 'Unknown';
    if (!gradeMap[gradeKey]) gradeMap[gradeKey] = { totalScore: 0, totalPoints: 0, count: 0 };
    gradeMap[gradeKey].totalScore += g.score || 0;
    gradeMap[gradeKey].totalPoints += g.totalPoints || 0;
    gradeMap[gradeKey].count++;
  }

  return Object.entries(gradeMap).map(([grade, data]) => ({
    grade,
    averageScore: data.totalPoints > 0 ? Math.round((data.totalScore / data.totalPoints) * 100) : 0,
    studentCount: data.count,
    totalPoints: data.totalPoints,
  }));
}

export async function getTeacherComparison(schoolId?: string) {
  const users = docsToArray(await schoolFilter(collections.users(), schoolId).get());
  const classes = docsToArray(await schoolFilter(collections.classes(), schoolId).get());
  const grades = docsToArray(await collections.grades().get());

  const teacherMap: Record<string, { totalScore: number; totalPoints: number; count: number; classIds: Set<string> }> = {};

  for (const cls of classes) {
    if (cls.teacherIds) {
      for (const tid of cls.teacherIds) {
        if (!teacherMap[tid]) teacherMap[tid] = { totalScore: 0, totalPoints: 0, count: 0, classIds: new Set() };
        teacherMap[tid].classIds.add(cls.id);
      }
    }
  }

  for (const g of grades) {
    const student = users.find((u) => u.id === g.studentId);
    if (!student) continue;
    for (const [tid, data] of Object.entries(teacherMap)) {
      const studentClassIds = student.classIds || [student.classId].filter(Boolean);
      const hasStudent = studentClassIds.some((cid: string) => data.classIds.has(cid));
      if (hasStudent) {
        data.totalScore += g.score || 0;
        data.totalPoints += g.totalPoints || 0;
        data.count++;
      }
    }
  }

  return Object.entries(teacherMap).map(([teacherId, data]) => {
    const teacher = users.find((u) => u.id === teacherId);
    return {
      teacherId,
      teacherName: teacher?.displayName || 'Unknown',
      averageScore: data.totalPoints > 0 ? Math.round((data.totalScore / data.totalPoints) * 100) : 0,
      studentCount: data.count,
      classCount: data.classIds.size,
    };
  });
}

export async function getClassComparison(schoolId?: string) {
  const classes = docsToArray(await schoolFilter(collections.classes(), schoolId).get());
  const grades = docsToArray(await collections.grades().get());

  const classMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  for (const g of grades) {
    const clsId = g.classId;
    if (!clsId) continue;
    if (!classMap[clsId]) classMap[clsId] = { totalScore: 0, totalPoints: 0, count: 0 };
    classMap[clsId].totalScore += g.score || 0;
    classMap[clsId].totalPoints += g.totalPoints || 0;
    classMap[clsId].count++;
  }

  return Object.entries(classMap).map(([classId, data]) => {
    const cls = classes.find((c) => c.id === classId);
    return {
      classId,
      className: cls?.name || 'Unknown',
      grade: cls?.grade || '',
      averageScore: data.totalPoints > 0 ? Math.round((data.totalScore / data.totalPoints) * 100) : 0,
      studentCount: data.count,
    };
  }).sort((a, b) => b.averageScore - a.averageScore);
}

/** @deprecated Use analytics.service.ts::getAdminDashboard for full school stats. Delegates to it. */
export async function getSchoolOverview() {
  return getAdminDashboard();
}

export async function getPerformanceTrends(schoolId?: string) {
  const grades = docsToArray(await schoolFilter(collections.grades(), schoolId).get());

  const monthMap: Record<string, { totalScore: number; totalPoints: number; count: number }> = {};

  for (const g of grades) {
    const date = g.createdAt || g.updatedAt;
    if (!date) continue;
    const month = date.substring(0, 7);
    if (!monthMap[month]) monthMap[month] = { totalScore: 0, totalPoints: 0, count: 0 };
    monthMap[month].totalScore += g.score || 0;
    monthMap[month].totalPoints += g.totalPoints || 0;
    monthMap[month].count++;
  }

  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month,
      averageScore: data.totalPoints > 0 ? Math.round((data.totalScore / data.totalPoints) * 100) : 0,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
