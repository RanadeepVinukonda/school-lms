import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/Icon';
import { getInitials } from '@/lib/utils';
import { cardStackReveal } from '@/lib/motion';
import { useTranslation } from '@/hooks/useTranslation';
import type { UserDoc, CorrectionItem, ExamItem } from '@/services/dataService';

interface MarkEntry {
  questionId: string;
  marks: number;
  feedback: string;
}

interface StudentStatus {
  student: UserDoc;
  submitted: boolean;
  correction: CorrectionItem | null;
  totalMarks: number | null;
  maxMarks: number;
}

interface StudentCorrectionPanelProps {
  student: StudentStatus;
  exam: ExamItem;
  expandedStudent: string | null;
  marks: Record<string, MarkEntry[]>;
  overallFeedback: Record<string, string>;
  onToggleExpand: (studentId: string) => void;
  onMarksChange: (
    studentId: string,
    questionIndex: number,
    field: 'marks' | 'feedback',
    value: string,
  ) => void;
  onOverallFeedbackChange: (studentId: string, value: string) => void;
  onPublish: (studentId: string) => void;
}

export function StudentCorrectionPanel({
  student: { student, submitted, correction },
  exam,
  expandedStudent,
  marks,
  overallFeedback,
  onToggleExpand,
  onMarksChange,
  onOverallFeedbackChange,
  onPublish,
}: StudentCorrectionPanelProps) {
  const { _ } = useTranslation();
  const isExpanded = expandedStudent === student.id;

  const examQuestions = (exam.questions as { id: string; type: string; question: string; points: number; options?: string[]; correctAnswer?: string }[]) ?? [];

  return (
    <motion.div variants={cardStackReveal} custom={0}>
      <div className="border-b last:border-b-0">
        <button
          type="button"
          onClick={() => onToggleExpand(student.id)}
          className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-xs">
              {getInitials(student.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{student.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {student.studentId ?? student.id}
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            {submitted && correction ? (
              <>
                <Badge variant="success" className="text-[10px]">
                  {_('Submitted')}
                </Badge>
                <span className="text-sm font-semibold tabular-nums">
                  {correction.totalMarks}/
                  {examQuestions.reduce((s, q) => s + q.points, 0)}
                </span>
              </>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                {_('Pending')}
              </Badge>
            )}
            <Icon
              name={isExpanded ? 'expand_less' : 'expand_more'}
              size={20}
              className="text-muted-foreground/50"
            />
          </div>
        </button>

        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t bg-muted/20"
          >
            <div className="p-4 space-y-4">
              {examQuestions.map((question, qi) => (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          Q{qi + 1}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {question.type === 'multiple_choice' ? _('MCQ') : _('Essay')} &middot;{' '}
                          {question.points} {_('pts')}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{question.question}</p>
                      {question.type === 'multiple_choice' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {_('Options')}: {question.options?.join(', ') ?? _('N/A')}
                        </p>
                      )}
                      <p className="text-xs text-on-success-container mt-0.5">
                        Correct answer: {question.correctAnswer}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border bg-card p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Student Answer:
                    </p>
                    <p className="text-sm italic">
                      {correction
                        ? (correction.questionMarks as { questionId: string; marks: number; feedback: string }[])?.find(
                            (qm) => qm.questionId === question.id,
                          )?.feedback ?? 'Answer provided'
                        : 'No submission yet'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-32">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Marks awarded (max {question.points})
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={question.points}
                        value={marks[student.id]?.[qi]?.marks ?? ''}
                        onChange={(e) =>
                          onMarksChange(student.id, qi, 'marks', e.target.value)
                        }
                        disabled={!submitted}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Feedback
                      </label>
                      <Textarea
                        value={marks[student.id]?.[qi]?.feedback ?? ''}
                        onChange={(e) =>
                          onMarksChange(student.id, qi, 'feedback', e.target.value)
                        }
                        disabled={!submitted}
                        placeholder="Add feedback for this question..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>
                  {qi < examQuestions.length - 1 && <Separator />}
                </div>
              ))}

              <div className="pt-2">
                <label className="text-sm font-medium mb-1 block">
                  Overall Feedback
                </label>
                <Textarea
                  value={overallFeedback[student.id] ?? ''}
                  onChange={(e) => onOverallFeedbackChange(student.id, e.target.value)}
                  disabled={!submitted}
                  placeholder="Write overall feedback for this student..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => onPublish(student.id)}
                  disabled={!submitted}
                  className="gap-1"
                >
                  <Icon name="send" size={16} />
                  Publish Grades
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
