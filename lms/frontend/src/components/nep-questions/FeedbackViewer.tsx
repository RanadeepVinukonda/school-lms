import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { generateFeedback, getRubrics } from '@/services/nepQuestionsService';
import type { FeedbackSummary, GradingRubric } from '@/types/nepQuestions';

interface SubmissionOption {
  id: string;
  studentName: string;
  answer: string;
}

interface FeedbackViewerProps {
  submissions: SubmissionOption[];
}

export function FeedbackViewer({ submissions }: FeedbackViewerProps) {
  const [selectedSubmission, setSelectedSubmission] = useState('');
  const [selectedRubric, setSelectedRubric] = useState('');
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
  const submission = submissions.find((s) => s.id === selectedSubmission);
  const { data: rubrics } = useQuery({
    queryKey: ['rubrics-list'],
    queryFn: () => getRubrics(),
  });

  const rubric = rubrics?.find((r) => r.id === selectedRubric);
  const generateMutation = useMutation({
    mutationFn: () => {
      if (!submission || !rubric) throw new Error('Select submission and rubric');
      return generateFeedback({
        submissionId: submission.id,
        rubricId: rubric.id,
        studentAnswer: submission.answer,
        rubric,
      });
    },
    onSuccess: (data) => {
      setFeedback(data);
      toast.success('Feedback generated');
    },
    onError: () => toast.error('Failed to generate feedback'),
  });

  const gradeColors: Record<string, string> = {
    A: 'bg-green-100 text-green-800 border-green-300',
    B: 'bg-blue-100 text-blue-800 border-blue-300',
    C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    D: 'bg-orange-100 text-orange-800 border-orange-300',
    F: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Submission</label>
          <select
            value={selectedSubmission}
            onChange={(e) => { setSelectedSubmission(e.target.value); setFeedback(null); }}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1"
          >
            <option value="">Choose a submission...</option>
            {submissions.map((s) => (
              <option key={s.id} value={s.id}>{s.studentName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Select Rubric</label>
          <select
            value={selectedRubric}
            onChange={(e) => { setSelectedRubric(e.target.value); setFeedback(null); }}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1"
          >
            <option value="">Choose a rubric...</option>
            {rubrics?.map((r) => (
              <option key={r.id} value={r.id}>{r.title} ({r.totalMarks} marks)</option>
            ))}
          </select>
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={!selectedSubmission || !selectedRubric || generateMutation.isPending}
          loading={generateMutation.isPending}
          className="w-full"
        >
          <Icon name="auto_awesome" size={18} className="mr-2" />
          Generate AI Feedback
        </Button>
      </div>

      {submission && (
        <div>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-label-sm font-medium mb-1">Student Answer:</p>
              <p className="text-body-sm text-muted-foreground whitespace-pre-wrap">{submission.answer.slice(0, 500)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {feedback && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
            <div className="flex-1">
              <p className="text-label-sm font-medium text-muted-foreground">Overall Score</p>
              <p className="text-display-sm font-bold text-primary">{feedback.overallScore}/{rubric?.totalMarks || 100}</p>
            </div>
            <div className="text-center">
              <p className="text-label-sm font-medium text-muted-foreground">Grade</p>
              <span className={`inline-flex items-center justify-center h-14 w-14 rounded-full border-2 text-title-md font-bold ${
                gradeColors[feedback.grade] || 'bg-gray-100 text-gray-800'
              }`}>
                {feedback.grade}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="check_circle" size={20} className="text-green-600" />
                  <h4 className="text-title-sm font-semibold text-green-800">Strengths</h4>
                </div>
                <ul className="space-y-2">
                  {feedback.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-label-sm text-green-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="warning" size={20} className="text-orange-600" />
                  <h4 className="text-title-sm font-semibold text-orange-800">Weaknesses</h4>
                </div>
                <ul className="space-y-2">
                  {feedback.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-label-sm text-orange-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                      {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="lightbulb" size={20} className="text-blue-600" />
                  <h4 className="text-title-sm font-semibold text-blue-800">Suggestions</h4>
                </div>
                <ul className="space-y-2">
                  {feedback.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-label-sm text-blue-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
