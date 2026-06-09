import { getTextbooksBySubject } from './textbookService';
import { getAssignmentsBySubject, getExamsBySubject, getAllGrades, getStudentsByClass, getTimetableByClass, getUser, getAllUsers, getSubmissionsByAssignment } from './dataService';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface DependencyReport {
  entityName: string;
  entityType: string;
  totalDependents: number;
  categories: { label: string; count: number; action?: string }[];
  canArchive: boolean;
  canDelete: boolean;
  recommendedAction: 'archive' | 'deactivate' | 'delete' | 'cancel';
}

/** Analyze what depends on a subject before deletion. */
export async function getSubjectDependencies(subjectId: string): Promise<DependencyReport> {
  const [textbooks, assignments, exams, users, grades] = await Promise.all([
    getTextbooksBySubject(subjectId),
    getAssignmentsBySubject(subjectId).catch(() => []),
    getExamsBySubject(subjectId).catch(() => []),
    getAllUsers().catch(() => []),
    getAllGrades().catch(() => []),
  ]);

  const enrolledStudents = users.filter((u) => u.classIds?.some(() => true));
  const subjectGrades = grades.filter((g) => g.subjectId === subjectId);
  const teacherCount = users.filter(
    (u) => u.role === 'teacher' && u.classIds?.some(() => true),
  ).length;

  const categories: DependencyReport['categories'] = [];
  if (textbooks.length > 0) categories.push({ label: 'Textbooks', count: textbooks.length });
  if (assignments.length > 0) categories.push({ label: 'Assignments', count: assignments.length });
  if (exams.length > 0) categories.push({ label: 'Exams', count: exams.length });
  if (subjectGrades.length > 0) categories.push({ label: 'Grade records', count: subjectGrades.length });
  if (enrolledStudents.length > 0) categories.push({ label: 'Enrolled students', count: enrolledStudents.length });

  const totalDependents = categories.reduce((s, c) => s + c.count, 0);

  return {
    entityName: 'this subject',
    entityType: 'subject',
    totalDependents,
    categories,
    canArchive: totalDependents > 0,
    canDelete: totalDependents === 0,
    recommendedAction: totalDependents > 0 ? 'archive' : 'delete',
  };
}

/** Analyze what depends on a class before deletion. */
export async function getClassDependencies(classId: string): Promise<DependencyReport> {
  const [students, timetableEntries, users] = await Promise.all([
    getStudentsByClass(classId).catch(() => []),
    getTimetableByClass(classId).catch(() => []),
    getAllUsers().catch(() => []),
  ]);

  const teachers = users.filter(
    (u) => u.role === 'teacher' && u.classIds?.includes(classId),
  );

  const categories: DependencyReport['categories'] = [];
  if (students.length > 0) categories.push({ label: 'Students assigned', count: students.length });
  if (teachers.length > 0) categories.push({ label: 'Teachers assigned', count: teachers.length });
  if (timetableEntries.length > 0) categories.push({ label: 'Timetable slots', count: timetableEntries.length });

  const totalDependents = categories.reduce((s, c) => s + c.count, 0);

  return {
    entityName: 'this class',
    entityType: 'class',
    totalDependents,
    categories,
    canArchive: true,
    canDelete: students.length === 0,
    recommendedAction: totalDependents > 0 ? 'archive' : 'delete',
  };
}

/** Analyze what depends on a user before deletion or deactivation. */
export async function getUserDependencies(userId: string): Promise<DependencyReport> {
  const user = await getUser(userId);
  if (!user) {
    return {
      entityName: 'this user',
      entityType: 'user',
      totalDependents: 0,
      categories: [],
      canArchive: false,
      canDelete: true,
      recommendedAction: 'delete',
    };
  }

  const categories: DependencyReport['categories'] = [];

  if (user.role === 'teacher') {
    const allUsers = await getAllUsers().catch(() => []);
    const assignedClasses = allUsers.filter(
      (u) => u.classIds?.some(() => true) && u.teacherId === userId,
    );
    if (assignedClasses.length > 0) {
      categories.push({ label: 'Classes assigned', count: assignedClasses.length });
    }
  }

  if (user.role === 'student') {
    const allGrades = await getAllGrades().catch(() => []);
    const studentGrades = allGrades.filter((g) => g.studentId === userId);
    if (studentGrades.length > 0) {
      categories.push({ label: 'Grade records', count: studentGrades.length, action: 'Preserved on deactivation' });
    }
  }

  return {
    entityName: user.displayName,
    entityType: 'user',
    totalDependents: categories.reduce((s, c) => s + c.count, 0),
    categories,
    canArchive: true,
    canDelete: false,
    recommendedAction: 'deactivate',
  };
}
