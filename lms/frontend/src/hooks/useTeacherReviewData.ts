import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  getAllSubjects, getUserByRole,
  getExamsBySubject, getAssignmentsBySubject, getCorrectionsByExam,
  getSubmissionsByAssignment,
} from '@/services/dataService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';

export interface ReviewSubmission {
  submission: import('@/services/dataService').SubmissionItem;
  assignment: import('@/services/dataService').AssignmentItem;
  studentName: string;
}

export interface ReviewExam {
  exam: import('@/services/dataService').ExamItem;
  subjectName: string;
  correctionCount: number;
}

export interface ReviewAssignment {
  assignment: import('@/services/dataService').AssignmentItem;
  subjectName: string;
  submissionCount: number;
  submittedCount: number;
  gradedCount: number;
}

export interface TeacherReviewData {
  awaitingGrading: ReviewSubmission[];
  lateSubmissions: ReviewAssignment[];
  needCorrection: ReviewExam[];
}

/** Central data loader for the teacher review pages (awaiting grading / late / correction). */
export function useTeacherReviewData() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<TeacherReviewData>({
    queryKey: ['teacher-review-data', userId],
    queryFn: async (): Promise<TeacherReviewData> => {
      const [allSubjects, students, assignmentsRes] = await Promise.all([
        getAllSubjects(),
        getUserByRole('student'),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
      ]);

      const myAssignments = assignmentsRes?.data ?? [];
      const subjectIds = [...new Set(myAssignments.map((a) => a.subjectId))];

      const [examArrays, assignmentArrays] = await Promise.all([
        Promise.all(subjectIds.map((sid) => getExamsBySubject(sid))),
        Promise.all(subjectIds.map((sid) => getAssignmentsBySubject(sid))),
      ]);

      const allExams = examArrays.flat();
      const allAssignments = assignmentArrays.flat();
      const todayKey = new Date().toISOString().slice(0, 10);

      const [correctionArrays, submissionArrays] = await Promise.all([
        Promise.all(allExams.map(async (exam) => {
          try { return await getCorrectionsByExam(exam.id); }
          catch { return []; }
        })),
        Promise.all(allAssignments.map((ass) => getSubmissionsByAssignment(ass.id))),
      ]);

      const correctionsByExam = new Map<string, import('@/services/dataService').CorrectionItem[]>();
      allExams.forEach((exam, i) => correctionsByExam.set(exam.id, correctionArrays[i] || []));

      const submissionsByAssignment = new Map<string, import('@/services/dataService').SubmissionItem[]>();
      allAssignments.forEach((ass, i) => submissionsByAssignment.set(ass.id, submissionArrays[i] || []));

      const subjectNameById = new Map(allSubjects.map((s) => [s.id, s.name]));
      const studentNameById = new Map(students.map((s) => [s.id, s.displayName || s.email || 'Student']));

      const awaitingGrading: ReviewSubmission[] = [];
      for (const assignment of allAssignments) {
        const subs = submissionsByAssignment.get(assignment.id) || [];
        for (const submission of subs) {
          if (submission.status !== 'submitted') continue;
          awaitingGrading.push({
            submission,
            assignment,
            studentName: studentNameById.get(submission.studentId) || 'Student',
          });
        }
      }
      awaitingGrading.sort((a, b) =>
        (b.submission.submittedAt || '').localeCompare(a.submission.submittedAt || ''));

      const lateSubmissions: ReviewAssignment[] = allAssignments
        .filter((a) => a.dueDate && a.dueDate.slice(0, 10) < todayKey)
        .map((assignment) => {
          const subs = submissionsByAssignment.get(assignment.id) || [];
          return {
            assignment,
            subjectName: subjectNameById.get(assignment.subjectId || '') || '—',
            submissionCount: subs.length,
            submittedCount: subs.filter((s) => s.status === 'submitted' || s.status === 'graded').length,
            gradedCount: subs.filter((s) => s.status === 'graded').length,
          };
        })
        .sort((a, b) => (a.assignment.dueDate || '').localeCompare(b.assignment.dueDate || ''));

      const correctedExamIds = new Set(allExams.flatMap((e) => (correctionsByExam.get(e.id) || [])).map((c) => c.examId));
      const needCorrection: ReviewExam[] = allExams
        .filter((exam) => !correctedExamIds.has(exam.id))
        .map((exam) => ({
          exam,
          subjectName: subjectNameById.get(exam.subjectId || '') || '—',
          correctionCount: (correctionsByExam.get(exam.id) || []).length,
        }))
        .sort((a, b) => (b.exam.createdAt || '').localeCompare(a.exam.createdAt || ''));

      return { awaitingGrading, lateSubmissions, needCorrection };
    },
    enabled: !!userId,
  });
}
