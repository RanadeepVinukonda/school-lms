import { useState, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getConceptProgress, saveConceptProgress, getConceptRelease } from '@/services/textbookService';
import { useAuthStore } from '@/store/authStore';
import { ConceptDetailMindMap } from '@/components/teacher/ConceptDetailMindMap';
import type { GeneratedQuestion } from '@/types/textbook';

type QuestionType = GeneratedQuestion['type'];

const questionConfig: Record<QuestionType, { label: string; icon: string }> = {
  mcq: { label: 'Multiple Choice', icon: 'radio_button_checked' },
  true_false: { label: 'True/False', icon: 'toggle_on' },
  fill_blank: { label: 'Fill in the Blank', icon: 'space_bar' },
  short_answer: { label: 'Short Answer', icon: 'short_text' },
  long_answer: { label: 'Long Answer', icon: 'subject' },
  numerical: { label: 'Numerical', icon: 'calculate' },
  scenario: { label: 'Scenario', icon: 'psychology' },
};

function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: GeneratedQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  switch (question.type) {
    case 'mcq':
    case 'true_false':
      return (
        <div className="mt-2 space-y-1">
          {(question.options ?? []).map((opt, oi) => (
            <label
              key={oi}
              className={`flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors ${
                value === opt ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name={`q_${question.id}`}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                disabled={disabled}
                className="text-primary"
              />
              <span>{String.fromCharCode(65 + oi)}. {opt}</span>
            </label>
          ))}
        </div>
      );
    case 'fill_blank':
    case 'short_answer':
      return (
        <Input
          className="mt-2"
          placeholder="Type your answer..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case 'long_answer':
    case 'scenario':
      return (
        <Textarea
          className="mt-2 min-h-[100px]"
          placeholder="Write your answer in detail..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case 'numerical':
      return (
        <Input
          type="number"
          className="mt-2"
          placeholder="Enter a number..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}

function normalize(a: string | string[]): string {
  return Array.isArray(a) ? a.join(', ').toLowerCase().trim() : a.toLowerCase().trim();
}

function isCorrect(question: GeneratedQuestion, answer: string): boolean {
  const correct = normalize(question.correctAnswer);
  const user = answer.toLowerCase().trim();
  if (question.type === 'numerical') {
    const cNum = parseFloat(correct);
    const uNum = parseFloat(user);
    return !isNaN(cNum) && !isNaN(uNum) && Math.abs(cNum - uNum) < 0.01;
  }
  return user === correct;
}

function UnlockOverlay({ icon, message }: { icon: string; message: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Icon name={icon} size={48} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export default function StudentConceptPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const [searchParams] = useSearchParams();
  const textbookId = searchParams.get('textbookId') || '';
  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id ?? '';
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-concept', textbookId, conceptId, userId],
    queryFn: async () => {
      if (!textbookId || !conceptId) throw new Error('Missing params');
      const [fb, chapters] = await Promise.all([
        getTextbook(textbookId),
        getChaptersForTextbook(textbookId),
      ]);
      if (!fb) throw new Error('Textbook not found');
      for (const ch of chapters) {
        const concepts = await getConceptsForChapter(textbookId, ch.id);
        const c = concepts.find((co) => co.id === conceptId);
        if (c) {
          const [progress, release] = await Promise.all([
            userId ? getConceptProgress(userId, conceptId) : null,
            getConceptRelease(textbookId, conceptId),
          ]);
          return { concept: c, chapter: ch, textbook: fb, progress, release };
        }
      }
      throw new Error('Concept not found');
    },
    enabled: !!textbookId && !!conceptId,
  });

  const saveMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      saveConceptProgress(userId, conceptId!, updates),
  });

  const concept = data?.concept;
  const progress = data?.progress;
  const release = data?.release;
  const questionBankReleased = release?.questionBankReleased ?? false;
  const practiceCompleted = progress?.practiceCompleted ?? false;

  const handleAnswer = useCallback((qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }, []);

  const handleSubmitPractice = useCallback(() => {
    if (!concept) return;
    const qs = concept.questionBank || [];
    let correct = 0;
    qs.forEach((q) => {
      if (isCorrect(q, answers[q.id] ?? '')) correct++;
    });
    const accuracy = qs.length > 0 ? correct / qs.length : 0;
    saveMutation.mutate({
      questionAccuracy: accuracy,
      practiceCompleted: accuracy >= 0.6,
      lastAccessed: new Date().toISOString(),
    });
    setSubmitted(true);
  }, [concept, answers, conceptId, userId]);

  const handleRetakePractice = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
  }, []);

  return (
    <>
      <SEOHead title={concept?.title || 'Concept'} description={concept?.summary || ''} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        <Link to={ROUTES.STUDENT_CHAPTER(textbookId, data?.chapter.id || '')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icon name="arrow_back" size={16} />
          Back to chapter
        </Link>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load concept') : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage="Concept not found"
        >
          {(d) => (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">{d.textbook.title}</Badge>
                  <span className="text-sm text-muted-foreground">Chapter {d.chapter.order + 1}</span>
                </div>
                <h1 className="text-headline-sm font-bold">{d.concept.title}</h1>
                <p className="text-muted-foreground mt-1">{d.concept.summary}</p>
                {progress && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {practiceCompleted && <Badge variant="outline" className="text-[10px] text-green-600 dark:text-green-400 border-green-300 dark:border-green-700"><Icon name="check_circle" size={12} className="mr-1" />Practice done</Badge>}
                    {(d.concept.questionBank || []).length > 0 && practiceCompleted && <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"><Icon name="bolt" size={12} className="mr-1" />Quiz ready</Badge>}
                  </div>
                )}
              </div>
 
              <Tabs defaultValue="learn">
                <TabsList className="w-full">
                  <TabsTrigger value="learn" className="flex-1">
                    <Icon name="menu_book" size={14} className="mr-1.5" />Learn
                  </TabsTrigger>
                  <TabsTrigger value="mindmap" className="flex-1">
                    <Icon name="account_tree" size={14} className="mr-1.5" />Mind Map
                  </TabsTrigger>
                  <TabsTrigger value="practice" className="flex-1">
                    <Icon name="quiz" size={14} className="mr-1.5" />Practice
                    {practiceCompleted && <Icon name="check_circle" size={12} className="ml-1 text-green-500" />}
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="flex-1">
                    <Icon name="bolt" size={14} className="mr-1.5" />Quiz
                  </TabsTrigger>
                </TabsList>
 
                <TabsContent value="learn" className="mt-4 space-y-4">
                  <Card>
                    <CardContent className="p-5">
                      <h2 className="font-semibold mb-3 flex items-center gap-2">
                        <Icon name="menu_book" size={18} className="text-primary" />
                        Study Notes
                      </h2>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {d.concept.notes}
                      </div>
                    </CardContent>
                  </Card>
 
                  {(d.concept.learningObjectives || []).length > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h2 className="font-semibold mb-3 flex items-center gap-2">
                          <Icon name="track_changes" size={18} className="text-tertiary" />
                          Learning Objectives
                        </h2>
                        <ul className="space-y-1.5">
                          {d.concept.learningObjectives!.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-tertiary mt-0.5">•</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
 
                  {(d.concept.keywords || []).length > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h2 className="font-semibold mb-3 flex items-center gap-2">
                          <Icon name="label" size={18} className="text-primary" />
                          Keywords
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                          {d.concept.keywords!.map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
 
                  {(d.concept.questionBank || []).length > 0 && (<>
<Button variant="outline" className="flex-1" onClick={() => {
                        const tab = document.querySelector('[data-value="practice"]') as HTMLElement;
                        tab?.click();
                      }}>
                        <Icon name="quiz" size={16} className="mr-2" />
                        Practice ({(d.concept.questionBank || []).length})
                      </Button>

{/* Start Adaptive Quiz button */}
<Button variant="default" className="flex-1" onClick={async () => {
  try {
    const res = await api.get(`/quizzes-v2/concept/${conceptId}`);
    const quizId = res.data.data.id;
    // Navigate to quiz take page
    navigate(ROUTES.STUDENT_TAKE_ASSESSMENT(quizId) + '?type=quiz');
  } catch (e) {
    toast.error('Quiz not available');
  }
}}>
  <Icon name="play_arrow" size={16} className="mr-2" />
  Start Adaptive Quiz
</Button>
                  </>)}
                </TabsContent>

                <TabsContent value="mindmap" className="mt-4">
                  {!release?.mindMapReleased ? (
                    <UnlockOverlay icon="lock" message="The mind map has not yet been pushed by your teacher. It will be available once the concept is explained." />
                  ) : (
                    <ConceptDetailMindMap concept={d.concept} />
                  )}
                </TabsContent>

                <TabsContent value="practice" className="mt-4 space-y-4">
                  {!questionBankReleased ? (
                    <UnlockOverlay icon="lock" message="Practice questions are not yet released by your teacher. They will appear here once the teacher finishes explaining the concept." />
                  ) : (d.concept.questionBank || []).length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {submitted
                            ? `You scored ${(d.concept.questionBank || []).filter((q) => isCorrect(q, answers[q.id] ?? '')).length}/${(d.concept.questionBank || []).length}`
                            : `${(d.concept.questionBank || []).length} questions`
                          }
                        </p>
                        {submitted ? (
                          <Button variant="outline" size="sm" onClick={handleRetakePractice}>
                            <Icon name="refresh" size={14} className="mr-1" />
                            Retake
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">Answer all questions then submit</p>
                        )}
                      </div>

                      {(d.concept.questionBank || []).map((q, i) => {
                        const userAnswer = answers[q.id] ?? '';
                        const correct = isCorrect(q, userAnswer);
                        return (
                          <Card key={q.id} className={submitted ? (correct ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700') : ''}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                  submitted ? (correct ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300') : 'bg-primary/10 text-primary'
                                }`}>
                                  {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>
                                    <Badge variant="outline" className="text-[10px] capitalize">{questionConfig[q.type]?.label || q.type}</Badge>
                                  </div>
                                  <p className="text-sm">{q.text}</p>
                                  <QuestionInput
                                    question={q}
                                    value={userAnswer}
                                    onChange={(v) => handleAnswer(q.id, v)}
                                    disabled={submitted}
                                  />
                                  {submitted && (
                                    <div className={`mt-2 p-3 rounded-lg border ${
                                      correct ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                                    }`}>
                                      <p className={`text-xs font-medium flex items-center gap-1 ${correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                        <Icon name={correct ? 'check_circle' : 'cancel'} size={14} />
                                        {correct ? 'Correct!' : `Answer: ${Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}`}
                                      </p>
                                      {q.explanation && (
                                        <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
)}
                                    </div>
)}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {!submitted && (
                        <Button className="w-full gap-2" size="lg" onClick={handleSubmitPractice}>
                          <Icon name="checklist" size={18} />
                          Submit Answers
                        </Button>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Icon name="quiz" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No questions generated yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="quiz" className="mt-4">
                  {!questionBankReleased ? (
                    <UnlockOverlay icon="lock" message="Questions are not yet released by your teacher. Check back later." />
                  ) : !practiceCompleted && (d.concept.questionBank || []).length > 0 ? (
                    <UnlockOverlay icon="lock" message="Complete the practice questions (60%+) to unlock the adaptive quiz." />
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Icon name="bolt" size={48} className="text-primary/50 mx-auto mb-3" />
                        <h2 className="text-title-md font-semibold mb-2">Adaptive Quiz</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Take an adaptive quiz that adjusts to your skill level. Questions are selected from {(d.concept.questionBank || []).length} available questions.
                        </p>
                        {progress && (
                          <div className="flex flex-wrap justify-center gap-3 mb-4">
                            {(progress.quizScores || []).length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Best: {Math.max(...(progress.quizScores || [0]))}%
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              Attempts: {progress.quizAttempts || 0}
                            </Badge>
                          </div>
                        )}
                        <Button asChild size="lg">
                          <Link to={`${ROUTES.STUDENT_CONCEPT_QUIZ(conceptId!)}?textbookId=${textbookId}`}>
                            <Icon name="play_arrow" size={18} className="mr-2" />
                            Start Adaptive Quiz
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
