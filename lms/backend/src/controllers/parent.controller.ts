import { Request, Response } from 'express';
import * as parentService from '../services/parent.service';
import * as analyticsService from '../services/analytics.service';
import * as gradeService from '../services/grade.service';
import { chatCompletion } from '../services/ai.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export async function getChildren(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const parentId = req.user.uid;

  const childrenIds = await parentService.getParentChildrenIds(parentId);
  if (childrenIds.length === 0) {
    sendSuccess(res, []);
    return;
  }

  const children = await parentService.getChildDetails(childrenIds);
  sendSuccess(res, children);
}

export async function getChildDashboard(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { studentId } = req.params;
  const parentId = req.user.uid;

  const isChild = await parentService.verifyChildOwnership(parentId, studentId);
  if (!isChild) {
    res.status(403).json({ success: false, error: { message: 'This student is not your child' } });
    return;
  }

  const student = await parentService.getChildProfile(studentId);

  let grades: Array<Record<string, unknown>> = [];
  let performance: Record<string, unknown> | null = null;
  try {
    grades = await gradeService.getStudentGrades(studentId) as Array<Record<string, unknown>>;
  } catch (err) {
    logger.warn('Failed to fetch student grades for dashboard', { studentId, error: err });
  }
  try {
    performance = await analyticsService.getStudentPerformance(studentId) as Record<string, unknown> | null;
  } catch (err) {
    logger.warn('Failed to fetch student performance for dashboard', { studentId, error: err });
  }

  const className = student.class_id
    ? await parentService.getChildClassName(student.class_id)
    : null;

  const scoredGrades = grades.filter((g) => g.percentage != null);
  const avgScore = scoredGrades.length > 0
    ? Math.round(scoredGrades.reduce((s: number, g) => s + (g.percentage as number), 0) / scoredGrades.length)
    : 0;

  sendSuccess(res, {
    student,
    className,
    overallAvgScore: (performance?.overallAvgScore as number) ?? avgScore,
    totalAttempts: (performance?.totalAttempts as number) ?? 0,
    recentActivity: (performance?.recentActivity ?? []) as Record<string, unknown>[],
    grades: grades,
  });
}

export async function getChildProgress(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { studentId } = req.params;
  const parentId = req.user.uid;

  const isChild = await parentService.verifyChildOwnership(parentId, studentId);
  if (!isChild) {
    res.status(403).json({ success: false, error: { message: 'This student is not your child' } });
    return;
  }

  const performance = await analyticsService.getStudentPerformance(studentId);
  const allGrades = await gradeService.getStudentGrades(studentId);

  sendSuccess(res, {
    ...(performance as object),
    grades: allGrades,
  });
}

export async function getChildReport(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { studentId } = req.params;
  const parentId = req.user.uid;

  const isChild = await parentService.verifyChildOwnership(parentId, studentId);
  if (!isChild) {
    res.status(403).json({ success: false, error: { message: 'This student is not your child' } });
    return;
  }

  const studentName = await parentService.getChildDisplayName(studentId);

  const performance = await analyticsService.getStudentPerformance(studentId);
  const recentGrades = await gradeService.getStudentGrades(studentId);

  const prompt = `You are an educational AI assistant generating a weekly progress report for a parent.

Student Name: ${studentName}
Overall Average Score: ${performance?.overallAvgScore ?? 'N/A'}%
Total Assessments Completed: ${performance?.totalAttempts ?? 0}
Recent Activity: ${JSON.stringify(performance?.recentActivity ?? [])}
Recent Grades: ${JSON.stringify((recentGrades as Record<string, unknown>[]).slice(0, 15))}

Generate a JSON report with this exact structure:
{
  "summary": "A 2-3 sentence overall summary of the student's performance this week",
  "strengths": ["strength1", "strength2"],
  "learningGaps": ["gap1", "gap2"],
  "recommendations": [
    {
      "area": "Subject/Concept name",
      "suggestion": "Specific actionable recommendation",
      "priority": "high|medium|low"
    }
  ],
  "weeklyOverview": "A paragraph about the week's progress",
  "nextSteps": ["step1", "step2", "step3"]
}`;

  let report;
  try {
    const raw = await chatCompletion({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You generate educational progress reports in JSON format only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });
    report = JSON.parse(raw);
  } catch (err) {
    logger.warn('AI report generation failed, returning data-driven fallback', { studentId, error: err });
    const activity = (performance?.recentActivity ?? []) as Array<Record<string, unknown>>;

    const highScores = activity.filter((a) => (a.score as number) >= 75);
    const lowScores = activity.filter((a) => (a.score as number) < 50);

    const strengths = highScores.length > 0
      ? highScores.map((a) => `Strong performance in "${a.title}" (${a.score}%)`)
      : (activity.length > 0 ? ['Consistently completing assigned coursework'] : ['Engaging with the learning platform']);

    const learningGaps = lowScores.length > 0
      ? lowScores.map((a) => `Needs improvement in "${a.title}" (${a.score}%)`)
      : (activity.length > 0 ? ['Continue to review and reinforce concepts'] : ['Begin attempting assessments to identify areas for growth']);

    const recs: Array<{ area: string; suggestion: string; priority: string }> = [];
    const avg = performance?.overallAvgScore ?? 0;
    if (avg < 50) recs.push({ area: 'Core Concepts', suggestion: 'Focus on strengthening foundational concepts. Consider requesting extra help sessions.', priority: 'high' as const });
    else if (avg < 75) recs.push({ area: 'Review', suggestion: 'Regular revision of class notes and completing practice problems will help improve scores.', priority: 'medium' as const });
    else recs.push({ area: 'Enrichment', suggestion: 'Student is performing well. Encourage advanced practice and exploration of topics.', priority: 'low' as const });
    if (lowScores.length > 0) recs.push({ area: 'Targeted Practice', suggestion: `Focus on improving in: ${lowScores.map((a) => `"${a.title}"`).join(', ')}`, priority: 'high' as const });

    const totalAssessments = performance?.totalAttempts ?? 0;
    const overviewText = totalAssessments > 0
      ? `${studentName} completed ${totalAssessments} assessment(s) with an overall average of ${avg}%. ${strengths.length > 0 ? 'Notable achievements include: ' + strengths.join('; ') + '.' : ''} ${learningGaps.length > 0 ? 'Areas to focus on: ' + learningGaps.join('; ') + '.' : ''}`
      : `${studentName} has not yet completed any assessments. Encourage starting with available quizzes to establish a baseline.`;

    report = {
      summary: `${studentName} has completed ${totalAssessments} assessment(s) with an average score of ${avg}%. ${totalAssessments > 0 ? 'Keep up the good work and focus on areas needing improvement.' : 'Getting started with assessments is the first step toward tracking progress.'}`,
      strengths,
      learningGaps,
      recommendations: recs.length > 0 ? recs : [{ area: 'General', suggestion: 'Maintain consistent study habits and engage with coursework daily.', priority: 'medium' as const }],
      weeklyOverview: overviewText,
      nextSteps: totalAssessments > 0
        ? ['Review recent assessment results', 'Practice on identified weak areas', 'Set a regular study schedule', 'Discuss progress with teachers']
        : ['Complete the first available assessment', 'Set up a study routine', 'Explore available learning resources', 'Connect with teachers for guidance'],
    };
  }

  sendSuccess(res, {
    studentId,
    studentName,
    generatedAt: new Date().toISOString(),
    report,
    recentGrades: (recentGrades as Record<string, unknown>[]).slice(0, 10),
  });
}

export async function getRecommendations(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const parentId = req.user.uid;

  const childrenIds = await parentService.getParentChildrenIds(parentId);
  if (childrenIds.length === 0) {
    sendSuccess(res, { recommendations: [] });
    return;
  }

  const nameMap = await parentService.getChildDisplayNames(childrenIds);

  const allRecommendations: Array<{ studentId: string; studentName: string; averageScore: number; totalAssessments: number; recommendations: Array<{ area: string; suggestion: string; priority: string }> }> = [];

  for (const childId of childrenIds) {
    const studentName = nameMap.get(childId);
    if (!studentName) continue;

    const performance = (await analyticsService.getStudentPerformance(childId)) as Record<string, unknown> | null;
    const scores = [
      ...((performance?.quizzes ?? []) as Record<string, unknown>[]).map((q) => q.percentage as number),
      ...((performance?.assignments ?? []) as Record<string, unknown>[]).map((a) => a.percentage as number),
      ...((performance?.exams ?? []) as Record<string, unknown>[]).map((e) => e.percentage as number),
    ].filter((p: number) => p > 0);

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s: number, p: number) => s + p, 0) / scores.length)
      : 0;

    const weakSubjects: string[] = [];
    if (((performance?.quizzes ?? []) as unknown[]).length > 0) {
      const quizzes = performance!.quizzes as Record<string, unknown>[];
      const quizAvg = quizzes.reduce((s: number, q) => s + (q.percentage as number), 0) / quizzes.length;
      if (quizAvg < 60) weakSubjects.push('Quizzes');
    }
    if (((performance?.assignments ?? []) as unknown[]).length > 0) {
      const assignments = performance!.assignments as Record<string, unknown>[];
      const asgnAvg = assignments.reduce((s: number, a) => s + (a.percentage as number), 0) / assignments.length;
      if (asgnAvg < 60) weakSubjects.push('Assignments');
    }
    if (((performance?.exams ?? []) as unknown[]).length > 0) {
      const exams = performance!.exams as Record<string, unknown>[];
      const examAvg = exams.reduce((s: number, e) => s + (e.percentage as number), 0) / exams.length;
      if (examAvg < 60) weakSubjects.push('Exams');
    }

    const recs: Array<{ area: string; suggestion: string; priority: string }> = [
      { area: 'General', suggestion: 'Maintain a consistent daily study schedule of at least 1-2 hours', priority: 'medium' },
    ];

    if (avgScore < 60) {
      recs.push({ area: 'Core Subjects', suggestion: 'Focus on strengthening foundational concepts. Consider scheduling extra help sessions with teachers.', priority: 'high' });
      recs.push({ area: 'Daily Practice', suggestion: 'Recommend 30 min daily practice on weak subjects identified in recent assessments', priority: 'high' });
    } else if (avgScore < 75) {
      recs.push({ area: 'Review', suggestion: 'Encourage regular revision of class notes and completion of all homework assignments', priority: 'medium' });
    } else {
      recs.push({ area: 'Enrichment', suggestion: 'Student is performing well. Encourage advanced reading and challenging problems.', priority: 'low' });
    }

    if (weakSubjects.length > 0) {
      recs.push({ area: weakSubjects.join(', '), suggestion: `Pay extra attention to ${weakSubjects.join(' and ')} — review past mistakes and practice similar problems`, priority: 'high' });
    }

    allRecommendations.push({
      studentId: childId,
      studentName,
      averageScore: avgScore,
      totalAssessments: (performance?.totalAttempts as number) ?? 0,
      recommendations: recs,
    });
  }

  sendSuccess(res, { recommendations: allRecommendations });
}
