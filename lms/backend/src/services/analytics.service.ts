import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { getSettings } from './settings.service';

function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Get a student's dashboard summary: total enrolled courses, unread notifications, overall grade, and stats. */
export async function getStudentDashboard(studentId: string) {
  const supabase = getSupabaseAdmin()!;
  
  const { data: enrollments, error: enrollmentsErr } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('status', 'active');
  if (enrollmentsErr) throw new Error(enrollmentsErr.message);
  
  const courseIds = (enrollments || []).map((e: { course_id: string }) => e.course_id);
  const totalCourses = courseIds.length;

  const { count: unreadNotificationsCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', studentId)
    .eq('read', false);

  const { data: grades, error: gradesErr } = await supabase
    .from('grades')
    .select('score, total_points')
    .eq('student_id', studentId);
  if (gradesErr) throw new Error(gradesErr.message);

  const gradesList = grades || [];
  const totalScore = gradesList.reduce((sum: number, g: { score?: number }) => sum + (g.score || 0), 0);
  const totalPoints = gradesList.reduce((sum: number, g: { total_points?: number }) => sum + (g.total_points || 1), 0);
  const overallGrade = safePct(totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0);

  const now = new Date().toISOString();
  
  const { count: pendingAssignments } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .in('course_id', courseIds.length > 0 ? courseIds : [])
    .gte('due_date', now);
  
  const { count: upcomingExams } = await supabase
    .from('exams')
    .select('id', { count: 'exact', head: true })
    .in('course_id', courseIds.length > 0 ? courseIds : [])
    .gte('start_date', now);

  logger.info('Student dashboard retrieved', { studentId });

  return {
    totalCourses,
    unreadNotifications: unreadNotificationsCount || 0,
    overallGrade,
    averageScore: overallGrade,
    pendingAssignments: pendingAssignments || 0,
    upcomingExams: upcomingExams || 0,
    recentActivity: [],
  };
}

/** Get a teacher's dashboard summary: total courses, total students, pending grading, unread notifications. */
export async function getTeacherDashboard(teacherId: string) {
  const supabase = getSupabaseAdmin()!;

  const { data: courses, error: coursesErr } = await supabase
    .from('courses')
    .select('id, enrollment_count')
    .eq('teacher_id', teacherId);
  if (coursesErr) throw new Error(coursesErr.message);

  const totalCourses = (courses || []).length;

  let totalStudents = 0;
  let pendingGrading = 0;
  
  if (courses && courses.length > 0) {
    const courseIds = courses.map((c: { id: string }) => c.id);
    
    const { count: submissionsCount } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .in('course_id', courseIds)
      .eq('status', 'submitted');
    
    pendingGrading = submissionsCount || 0;
    totalStudents = courses.reduce((sum: number, c: { enrollment_count?: number }) => sum + (c.enrollment_count || 0), 0);
  }

  const { count: unreadNotificationsCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', teacherId)
    .eq('read', false);

  logger.info('Teacher dashboard retrieved', { teacherId });

  return {
    totalCourses,
    totalStudents,
    pendingGrading,
    unreadNotifications: unreadNotificationsCount || 0,
  };
}

/** Get an admin dashboard summary: user counts, course/class stats. */
export async function getAdminDashboard() {
  const supabase = getSupabaseAdmin()!;

  const { count: studentsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student');
  const { count: teachersCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'teacher');
  const { count: adminsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  const { count: parentsCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'parent');

  const { count: totalCourses } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true });
  const { count: publishedCourses } = await supabase
    .from('courses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');

  const { count: totalClasses } = await supabase
    .from('classes')
    .select('id', { count: 'exact', head: true });
  const { count: activeClasses } = await supabase
    .from('classes')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  logger.info('Admin dashboard retrieved');

  return {
    totalUsers: (studentsCount || 0) + (teachersCount || 0) + (adminsCount || 0) + (parentsCount || 0),
    totalStudents: studentsCount || 0,
    totalTeachers: teachersCount || 0,
    totalAdmins: adminsCount || 0,
    totalParents: parentsCount || 0,
    totalCourses: totalCourses || 0,
    publishedCourses: publishedCourses || 0,
    totalClasses: totalClasses || 0,
    activeClasses: activeClasses || 0,
  };
}

/** Get analytics for a single course: enrollment, lessons, assignments, submissions, grades, completion rates. */
export async function getCourseAnalytics(courseId: string) {
  const supabase = getSupabaseAdmin()!;
  
  const { data: courseDoc, error: courseDocErr } = await supabase
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .maybeSingle();
  if (courseDocErr) throw new Error(courseDocErr.message);
  
  if (!courseDoc) {
    return null;
  }

  const { count: enrolledStudents } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'active');

  const { count: totalLessons } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  const { count: totalAssignments } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  const { count: totalSubmissions } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  const { data: grades, error: gradesErr } = await supabase
    .from('grades')
    .select('score, total_points')
    .eq('course_id', courseId);
  if (gradesErr) throw new Error(gradesErr.message);

  const gradesList = grades || [];
  const totalScore = gradesList.reduce((sum: number, g: { score?: number }) => sum + (g.score || 0), 0);
  const totalPoints = gradesList.reduce((sum: number, g: { total_points?: number }) => sum + (g.total_points || 1), 0);
  const averageGrade = safePct(totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0);

  const { data: lessons, error: lessonsErr } = await supabase
    .from('lessons')
    .select('id, title, completed_by')
    .eq('course_id', courseId);
  if (lessonsErr) throw new Error(lessonsErr.message);

  const completionRates: Array<{ lesson_id: string; title: string; completed_by: number }> = [];
  for (const row of lessons || []) {
    completionRates.push({
      lesson_id: row.id,
      title: row.title || '',
      completed_by: Array.isArray(row.completed_by) ? row.completed_by.length : 0,
    });
  }

  logger.info('Course analytics retrieved', { courseId });

  return {
    courseId,
    courseTitle: courseDoc.title,
    enrolledStudents: enrolledStudents || 0,
    totalLessons: totalLessons || 0,
    totalAssignments: totalAssignments || 0,
    totalSubmissions: totalSubmissions || 0,
    submissionRate: safePct((totalAssignments || 0) > 0 ? Math.round((totalSubmissions || 0) / (totalAssignments || 1) * 100) : 0),
    averageGrade,
    completionRates,
  };
}

// ── Merged from analytics-v2.service.ts ──

async function getAssessmentData(type: 'quiz' | 'assignment' | 'exam') {
  const supabase = getSupabaseAdmin()!;
  const collectionName = type === 'quiz' ? 'quizV2' : type === 'assignment' ? 'assignmentV2' : 'examV2';
  const { data: docs, error: docsErr } = await supabase
    .from('nosql_docs')
    .select('data, doc_id')
    .eq('collection', collectionName);
  if (docsErr) throw new Error(docsErr.message);
  const assessments = (docs || []).map((d: any) => ({ ...d.data, id: d.doc_id }));
  const attemptCollectionName = type === 'quiz' ? 'quizAttemptV2' : type === 'assignment' ? 'assignmentSubmissionV2' : 'examAttemptV2';
  return { assessments, attemptCollectionName };
}

export async function getClassPerformance(classId: string) {
  const supabase = getSupabaseAdmin()!;

  const { data: students, error: getCpStudentsErr } = await supabase
    .from('users')
    .select('id, data')
    .contains('class_ids', [classId])
    .eq('role', 'student');
  if (getCpStudentsErr) throw new Error(getCpStudentsErr.message);
  const totalStudents = (students || []).length;

  const levelDist = { beginner: 0, intermediate: 0, advanced: 0 };
  (students || []).forEach((d: any) => {
    const level: string = d.data?.level || 'beginner';
    if (level in levelDist) levelDist[level as keyof typeof levelDist]++;
  });

  const assessmentPromises = ['quiz', 'assignment', 'exam'].map(async (type) => {
    const { assessments } = await getAssessmentData(type as 'quiz' | 'assignment' | 'exam');
    const classAssessments = assessments.filter((a: any) => a.classId === classId);

    if (classAssessments.length === 0) return [];

    const results = [];
    for (const a of classAssessments) {
      const attemptCollectionName = type === 'quiz' ? 'quizAttemptV2' : type === 'assignment' ? 'assignmentSubmissionV2' : 'examAttemptV2';
      const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';

      const { data: attempts, error: getCpAttemptsErr } = await supabase
        .from('nosql_docs')
        .select('data')
        .eq('collection', attemptCollectionName)
        .filter('data->>' + idField, 'eq', a.id);
      if (getCpAttemptsErr) throw new Error(getCpAttemptsErr.message);

      const attemptData = (attempts || []).map((d: any) => d.data);
      const scored = attemptData.filter((at: any) => at.percentage != null);
      const avgScore = scored.length > 0
        ? safePct(Math.round(scored.reduce((s: number, at: any) => s + at.percentage, 0) / scored.length))
        : 0;
      const passCount = scored.filter((at: any) => at.passed === true).length;

      results.push({
        id: a.id,
        type,
        title: (a as any).title,
        avgScore,
        passRate: scored.length > 0 ? safePct(Math.round((passCount / scored.length) * 100)) : 0,
        attemptCount: attemptData.length,
        released: !!(a as any).releasedAt,
      });
    }

    return results;
  });

  const allResults = (await Promise.all(assessmentPromises)).flat();
  const scoredAll = allResults.filter((r) => r.attemptCount > 0);
  const totalScored = scoredAll.reduce((s, r) => s + r.attemptCount, 0);
  const totalPassed = scoredAll.reduce((s, r) => s + Math.round((r.passRate / 100) * r.attemptCount), 0);
  const overallAvg = totalScored > 0
    ? safePct(Math.round(scoredAll.reduce((s, r) => s + (r.avgScore * r.attemptCount), 0) / totalScored))
    : 0;
  const overallPass = totalScored > 0
    ? safePct(Math.round((totalPassed / totalScored) * 100))
    : 0;

  logger.info('Class performance retrieved', { classId });

  return {
    totalStudents,
    totalAssessments: allResults.length,
    avgScore: overallAvg,
    passRate: overallPass,
    assessments: allResults,
    studentLevelDistribution: levelDist,
  };
}

export async function getStudentPerformance(studentId: string) {
  const supabase = getSupabaseAdmin()!;

  const { data: userDoc, error: userDocErr } = await supabase
    .from('users')
    .select('data')
    .eq('id', studentId)
    .maybeSingle();
  if (userDocErr) throw new Error(userDocErr.message);
  const userLevel = userDoc ? (userDoc.data as any)?.level || 'beginner' : 'beginner';

  const allAttempts: Array<{ type: string; title: string; percentage: number; passed: boolean; submittedAt: string; level: string }> = [];

  for (const type of ['quiz', 'assignment', 'exam'] as const) {
    const attemptCollectionName = type === 'quiz' ? 'quizAttemptV2' : type === 'assignment' ? 'assignmentSubmissionV2' : 'examAttemptV2';
    const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';
    const parentCollectionName = type === 'quiz' ? 'quizV2' : type === 'assignment' ? 'assignmentV2' : 'examV2';

    const { data: attempts, error: getSpAttemptsErr } = await supabase
      .from('nosql_docs')
      .select('data, doc_id')
      .eq('collection', attemptCollectionName)
      .filter('data->>studentId', 'eq', studentId);
    if (getSpAttemptsErr) throw new Error(getSpAttemptsErr.message);

    for (const doc of (attempts || [])) {
      const at = doc.data as any;
      const parentId = at[idField];
      let title = type;

      if (parentId) {
        const { data: parent, error: parentErr } = await supabase
          .from('nosql_docs')
          .select('data')
          .eq('collection', parentCollectionName)
          .eq('doc_id', parentId)
          .maybeSingle();
        if (parentErr) throw new Error(parentErr.message);
        if (parent) title = (parent.data as any)?.title || title;
      }

      allAttempts.push({
        type,
        title,
        percentage: at.percentage ?? 0,
        passed: at.passed ?? false,
        submittedAt: at.submittedAt || at.startedAt,
        level: at.level || 'beginner',
      });
    }
  }

  allAttempts.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const scored = allAttempts.filter((a) => a.percentage > 0);
  const overallAvg = scored.length > 0
    ? safePct(Math.round(scored.reduce((s, a) => s + a.percentage, 0) / scored.length))
    : 0;

  logger.info('Student performance retrieved', { studentId });

  return {
    studentId,
    level: userLevel,
    overallAvgScore: overallAvg,
    totalAttempts: allAttempts.length,
    quizzes: allAttempts.filter((a) => a.type === 'quiz'),
    assignments: allAttempts.filter((a) => a.type === 'assignment'),
    exams: allAttempts.filter((a) => a.type === 'exam'),
    recentActivity: allAttempts.slice(0, 10).map((a) => ({
      type: a.type,
      title: a.title,
      score: a.percentage,
      date: a.submittedAt,
    })),
  };
}

export async function getAssessmentAnalytics(assessmentId: string, type: 'quiz' | 'assignment' | 'exam') {
  const supabase = getSupabaseAdmin()!;

  const parentCollectionName = type === 'quiz' ? 'quizV2' : type === 'assignment' ? 'assignmentV2' : 'examV2';
  const { data: parentDoc, error: parentDocErr } = await supabase
    .from('nosql_docs')
    .select('data')
    .eq('collection', parentCollectionName)
    .eq('doc_id', assessmentId)
    .maybeSingle();
  if (parentDocErr) throw new Error(parentDocErr.message);

  if (!parentDoc) return null;

  const parentData = parentDoc.data as any;
  const attemptCollectionName = type === 'quiz' ? 'quizAttemptV2' : type === 'assignment' ? 'assignmentSubmissionV2' : 'examAttemptV2';
  const idField = type === 'quiz' ? 'quizId' : type === 'assignment' ? 'assignmentId' : 'examId';

  const { data: attempts, error: getAaAttemptsErr } = await supabase
    .from('nosql_docs')
    .select('data, doc_id')
    .eq('collection', attemptCollectionName)
    .filter('data->>' + idField, 'eq', assessmentId);
  if (getAaAttemptsErr) throw new Error(getAaAttemptsErr.message);

  const attemptData = (attempts || []).map((d: any) => ({ id: d.doc_id, ...d.data }));

  const scored = attemptData.filter((a: any) => a.percentage != null);
  const avgScore = scored.length > 0
    ? safePct(Math.round(scored.reduce((s: number, a: any) => s + a.percentage, 0) / scored.length))
    : 0;
  const passCount = scored.filter((a: any) => a.passed === true).length;

  const scoreDist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  for (const a of scored) {
    const pct = a.percentage;
    if (pct <= 20) scoreDist['0-20']++;
    else if (pct <= 40) scoreDist['21-40']++;
    else if (pct <= 60) scoreDist['41-60']++;
    else if (pct <= 80) scoreDist['61-80']++;
    else scoreDist['81-100']++;
  }

  const studentIds = [...new Set(scored.map((a: any) => a.studentId))];
  const { data: studentDocs, error: studentDocsErr } = studentIds.length > 0
    ? await supabase.from('users').select('id, display_name, email, roll_no, student_id').in('id', studentIds)
    : { data: [], error: null };
  if (studentDocsErr) throw new Error(studentDocsErr.message);
  const studentMap = new Map((studentDocs || []).map((s: any) => [s.id, s]));

  logger.info('Assessment analytics retrieved', { assessmentId, type });

  return {
    id: assessmentId,
    title: parentData.title,
    attemptCount: attemptData.length,
    avgScore,
    passRate: scored.length > 0 ? safePct(Math.round((passCount / scored.length) * 100)) : 0,
    scoreDistribution: scoreDist,
    studentAttempts: scored.map((a: any) => {
      const student = studentMap.get(a.studentId);
      return {
        studentId: a.studentId,
        studentName: student?.display_name || student?.email || 'Unknown Student',
        studentRollNo: student?.roll_no || '-',
        studentCustomId: student?.student_id || '-',
        percentage: a.percentage,
        passed: a.passed,
        timeSpent: a.timeSpent,
        submittedAt: a.submittedAt,
        level: a.level,
      };
    }),
  };
}

export async function getConceptsForClass(classId: string) {
  const allItems = await getConceptOversight();
  return allItems.filter((item) => item.classId === classId);
}

export async function getConceptOversight() {
  const supabase = getSupabaseAdmin()!;

  const { data: tcsDocs, error: tcsDocsErr } = await supabase
    .from('nosql_docs')
    .select('data, doc_id')
    .eq('collection', 'teacherClassSubject');
  if (tcsDocsErr) throw new Error(tcsDocsErr.message);
  const assignments = (tcsDocs || []).map((d: any) => ({ id: d.doc_id, ...d.data }));

  const classIds = [...new Set(assignments.map((a: any) => a.classId))];
  const subjectIds = [...new Set(assignments.map((a: any) => a.subjectId))];
  const teacherIds = [...new Set(assignments.map((a: any) => a.teacherId))];

  const { data: classes, error: gcoClassesErr } = classIds.length > 0
    ? await supabase.from('classes').select('id, name').in('id', classIds)
    : { data: [], error: null };
  const { data: subjects, error: gcoSubjectsErr } = subjectIds.length > 0
    ? await supabase.from('subjects').select('id, name').in('id', subjectIds)
    : { data: [], error: null };
  const { data: teachers, error: gcoTeachersErr } = teacherIds.length > 0
    ? await supabase.from('users').select('id, display_name').in('id', teacherIds)
    : { data: [], error: null };
  if (gcoClassesErr) throw new Error(gcoClassesErr.message);
  if (gcoSubjectsErr) throw new Error(gcoSubjectsErr.message);
  if (gcoTeachersErr) throw new Error(gcoTeachersErr.message);

  const classMap = new Map((classes || []).map((c: any) => [c.id, c.name]));
  const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
  const teacherMap = new Map((teachers || []).map((t: any) => [t.id, t.display_name]));

  const settings = await getSettings();
  const threshold = settings.conceptFlaggingThreshold ?? 50;

  const oversightItems: any[] = [];

  for (const assignment of assignments) {
    const textbookId = assignment.textbookId;
    if (!textbookId) continue;

    try {
      const { data: chapters, error: chaptersErr } = await supabase
        .from('chapters')
        .select('id')
        .eq('textbook_id', textbookId);
      if (chaptersErr) throw new Error(chaptersErr.message);

      for (const chap of (chapters || [])) {
        const { data: concepts, error: gcoConceptsErr } = await supabase
          .from('concepts')
          .select('id, title')
          .eq('chapter_id', chap.id);
        if (gcoConceptsErr) throw new Error(gcoConceptsErr.message);

        for (const concept of (concepts || [])) {
          const conceptName = concept.title || 'Unknown Concept';

          const { data: quizDocs, error: quizDocsErr } = await supabase
            .from('nosql_docs')
            .select('doc_id')
            .eq('collection', 'quizV2')
            .filter('data->>classId', 'eq', assignment.classId)
            .filter('data->>conceptId', 'eq', concept.id);
          if (quizDocsErr) throw new Error(quizDocsErr.message);
          const quizIds = (quizDocs || []).map((d: any) => d.doc_id);

          const { data: assignDocs, error: assignDocsErr } = await supabase
            .from('nosql_docs')
            .select('doc_id')
            .eq('collection', 'assignmentV2')
            .filter('data->>classId', 'eq', assignment.classId)
            .filter('data->>conceptId', 'eq', concept.id);
          if (assignDocsErr) throw new Error(assignDocsErr.message);
          const assignmentIds = (assignDocs || []).map((d: any) => d.doc_id);

          let quizPercentages: number[] = [];
          for (const qId of quizIds) {
            const { data: attempts, error: quizAttemptsErr } = await supabase
              .from('nosql_docs')
              .select('data')
              .eq('collection', 'quizAttemptV2')
              .filter('data->>quizId', 'eq', qId);
            if (quizAttemptsErr) throw new Error(quizAttemptsErr.message);
            (attempts || []).forEach((d: any) => {
              const at = d.data;
              if (at.percentage != null) quizPercentages.push(at.percentage);
            });
          }

          let assignmentPercentages: number[] = [];
          for (const aId of assignmentIds) {
            const { data: submissions, error: submissionsErr } = await supabase
              .from('nosql_docs')
              .select('data')
              .eq('collection', 'assignmentSubmissionV2')
              .filter('data->>assignmentId', 'eq', aId);
            if (submissionsErr) throw new Error(submissionsErr.message);
            (submissions || []).forEach((d: any) => {
              const sub = d.data;
              if (sub.percentage != null) assignmentPercentages.push(sub.percentage);
            });
          }

          const allScores = [...quizPercentages, ...assignmentPercentages];
          const attemptCount = allScores.length;
          const averageScore = attemptCount > 0
            ? safePct(Math.round(allScores.reduce((sum, val) => sum + val, 0) / attemptCount))
            : 0;

          const status = (attemptCount > 0 && averageScore < threshold) ? 'low' : 'normal';

          oversightItems.push({
            classId: assignment.classId,
            className: classMap.get(assignment.classId) || 'Unknown Class',
            subjectId: assignment.subjectId,
            subjectName: subjectMap.get(assignment.subjectId) || 'Unknown Subject',
            conceptId: concept.id,
            conceptName,
            averageScore,
            attemptCount,
            teacherName: teacherMap.get(assignment.teacherId) || 'Unknown Teacher',
            teacherId: assignment.teacherId,
            status,
            threshold,
          });
        }
      }
    } catch (err) {
      logger.error('Error computing oversight for assignment', { assignmentId: assignment.id, err });
    }
  }

  return oversightItems;
}

export async function getConductedTests() {
  const supabase = getSupabaseAdmin()!;

  const [quizRes, examRes, assignmentRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
    supabase.from('nosql_docs').select('data, doc_id').eq('collection', 'quizV2'),
    supabase.from('nosql_docs').select('data, doc_id').eq('collection', 'examV2'),
    supabase.from('nosql_docs').select('data, doc_id').eq('collection', 'assignmentV2'),
    supabase.from('classes').select('id, name'),
    supabase.from('subjects').select('id, name'),
    supabase.from('users').select('id, display_name, email').eq('role', 'teacher'),
  ]);
  for (const res of [quizRes, examRes, assignmentRes, classesRes, subjectsRes, teachersRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const classMap = new Map((classesRes.data || []).map((c: any) => [c.id, c.name]));
  const subjectMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s.name]));
  const teacherMap = new Map((teachersRes.data || []).map((t: any) => [t.id, t.display_name || t.email]));

  const { data: allTextbooks, error: allTextbooksErr } = await supabase.from('textbooks').select('id');
  if (allTextbooksErr) throw new Error(allTextbooksErr.message);
  const conceptMap = new Map<string, string>();
  for (const tb of (allTextbooks || [])) {
    try {
      const { data: chapters, error: gctChaptersErr } = await supabase.from('chapters').select('id').eq('textbook_id', tb.id);
      if (gctChaptersErr) throw new Error(gctChaptersErr.message);
      for (const ch of (chapters || [])) {
        const { data: concepts, error: gctConceptsErr } = await supabase.from('concepts').select('id, title').eq('chapter_id', ch.id);
        if (gctConceptsErr) throw new Error(gctConceptsErr.message);
        (concepts || []).forEach((c: any) => {
          conceptMap.set(c.id, c.title || 'Unknown Concept');
        });
      }
    } catch {}
  }

  const tests: any[] = [];

  for (const doc of (quizRes.data || [])) {
    const data = doc.data as any;
    tests.push({
      id: doc.doc_id,
      type: 'Quiz',
      title: data.title,
      classId: data.classId,
      className: classMap.get(data.classId) || 'Unknown Class',
      subjectId: data.subjectId,
      subjectName: subjectMap.get(data.subjectId) || 'Unknown Subject',
      teacherId: data.teacherId,
      teacherName: teacherMap.get(data.teacherId) || 'Unknown Teacher',
      conceptId: data.conceptId,
      conceptName: conceptMap.get(data.conceptId) || 'General',
      examDate: data.examDate || data.createdAt || new Date().toISOString(),
      releasedAt: data.releasedAt,
    });
  }

  for (const doc of (examRes.data || [])) {
    const data = doc.data as any;
    tests.push({
      id: doc.doc_id,
      type: 'Exam',
      title: data.title,
      classId: data.classId,
      className: classMap.get(data.classId) || 'Unknown Class',
      subjectId: data.subjectId,
      subjectName: subjectMap.get(data.subjectId) || 'Unknown Subject',
      teacherId: data.teacherId,
      teacherName: teacherMap.get(data.teacherId) || 'Unknown Teacher',
      conceptId: data.conceptId,
      conceptName: conceptMap.get(data.conceptId) || 'General',
      examDate: data.examDate || data.createdAt || new Date().toISOString(),
      releasedAt: data.releasedAt,
    });
  }

  for (const doc of (assignmentRes.data || [])) {
    const data = doc.data as any;
    tests.push({
      id: doc.doc_id,
      type: 'Assignment',
      title: data.title,
      classId: data.classId,
      className: classMap.get(data.classId) || 'Unknown Class',
      subjectId: data.subjectId,
      subjectName: subjectMap.get(data.subjectId) || 'Unknown Subject',
      teacherId: data.teacherId,
      teacherName: teacherMap.get(data.teacherId) || 'Unknown Teacher',
      conceptId: data.conceptId,
      conceptName: conceptMap.get(data.conceptId) || 'General',
      examDate: data.examDate || data.createdAt || new Date().toISOString(),
      releasedAt: data.releasedAt,
    });
  }

  const results = [];
  for (const t of tests) {
    try {
      let attemptsRes;
      if (t.type === 'Quiz') {
        attemptsRes = await supabase.from('nosql_docs').select('data').eq('collection', 'quizAttemptV2').filter('data->>quizId', 'eq', t.id);
      } else if (t.type === 'Exam') {
        attemptsRes = await supabase.from('nosql_docs').select('data').eq('collection', 'examAttemptV2').filter('data->>examId', 'eq', t.id);
      } else {
        attemptsRes = await supabase.from('nosql_docs').select('data').eq('collection', 'assignmentSubmissionV2').filter('data->>assignmentId', 'eq', t.id);
      }
      if (attemptsRes.error) throw new Error(attemptsRes.error.message);

      const attempts = (attemptsRes.data || []).map((d: any) => d.data);
      const scored = attempts.filter((at: any) => at.percentage != null);
      const averageScore = scored.length > 0
        ? safePct(Math.round(scored.reduce((sum: number, at: any) => sum + at.percentage, 0) / scored.length))
        : 0;

      results.push({
        ...t,
        attemptCount: attempts.length,
        averageScore,
      });
    } catch (err) {
      logger.error('Error computing metrics for test', { testId: t.id, type: t.type, err });
      results.push({
        ...t,
        attemptCount: 0,
        averageScore: 0,
      });
    }
  }

  return results;
}