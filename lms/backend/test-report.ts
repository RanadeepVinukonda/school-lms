import * as parentService from './src/services/parent.service';
import * as analyticsService from './src/services/analytics.service';
import * as gradeService from './src/services/grade.service';
import { chatCompletion } from './src/services/ai.service';

(async () => {
  const sid = '1e0fb689-9ce4-421b-9ace-b927b3fffe9c';
  const studentName = await parentService.getChildDisplayName(sid);
  const performance: any = await analyticsService.getStudentPerformance(sid);
  const recentGrades: any = await gradeService.getStudentGrades(sid);

  const prompt = `You are an educational AI assistant generating a weekly progress report for a parent.

Student Name: ${studentName}
Overall Average Score: ${performance?.overallAvgScore ?? 'N/A'}%
Total Assessments Completed: ${performance?.totalAttempts ?? 0}
Recent Activity: ${JSON.stringify(performance?.recentActivity ?? [])}
Recent Grades: ${JSON.stringify((recentGrades as any).slice(0, 15))}

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

  try {
    const raw = await chatCompletion({ model: process.env.AI_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 2048 });
    console.log('RAW LENGTH:', raw.length);
    const report = JSON.parse(raw);
    console.log('PARSE OK:', Object.keys(report));
  } catch (e: any) {
    console.log('ERROR:', e.message);
    console.log(e.stack?.split('\n').slice(0, 8).join('\n'));
  }
})();
