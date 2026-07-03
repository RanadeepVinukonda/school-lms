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
import { QuestionRenderer } from '@/components/teacher/QuestionRenderer';
import { scrollReveal, staggerContainer, cardStackReveal, scaleFadeIn } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getConceptProgress, saveConceptProgress, getConceptRelease } from '@/services/textbookService';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
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
    <Card className="border-border/60">
      <CardContent className="p-12 text-center">
        <Icon name={icon} size={48} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export default function StudentConceptPage() {
  const { _ } = useTranslation();
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
            getConceptRelease(fb.classId, textbookId, conceptId),
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
      <SEOHead title={concept?.title || _('Concept')} description={concept?.summary || ''} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <Link to={ROUTES.STUDENT_CHAPTER(textbookId, data?.chapter.id || '')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Icon name="arrow_back" size={16} />
            {_('Back to chapter')}
          </Link>
        </motion.div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error(_('Failed to load concept')) : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage={_('Concept not found')}
        >
          {(d) => {
            const isReleased = d.release?.mindMapReleased;

            if (!isReleased) {
              return (
                <div className="space-y-16">
                  <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                    <Link to={`${ROUTES.STUDENT_CHAPTER(textbookId, d.chapter.id)}?textbookId=${textbookId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      <Icon name="arrow_back" size={16} />
                      {_('Back to chapter')}
                    </Link>
                  </motion.div>
                  <UnlockOverlay icon="lock" message={_('This concept has not yet been released by your teacher.')} />
                </div>
              );
            }

            return (
              <div className="space-y-16">
                <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{d.textbook.title}</Badge>
                      <span className="text-sm text-muted-foreground">{_('Chapter')} {d.chapter.order + 1}</span>
                    </div>
                    <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{d.concept.title}</h1>
                    <p className="text-muted-foreground mt-1">{d.concept.summary}</p>
                  </div>
                </motion.div>

                <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                  <Tabs defaultValue="studyMaterial">
                    <TabsList className="w-full overflow-x-auto inline-flex">
                      <TabsTrigger value="studyMaterial" className="flex-1">
                        <Icon name="menu_book" size={14} className="mr-1.5" />{_('Study Material')}
                      </TabsTrigger>
                      <TabsTrigger value="mindmap" className="flex-1">
                        <Icon name="account_tree" size={14} className="mr-1.5" />{_('Mind Map')}
                      </TabsTrigger>
                      <TabsTrigger value="quiz" className="flex-1">
                        <Icon name="bolt" size={14} className="mr-1.5" />{_('Quiz')}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="studyMaterial" className="mt-4 space-y-4">
                      {(d.concept.learningObjectives || []).length > 0 && (
                        <Card className="border-border/60">
                          <CardContent className="p-5">
                            <h2 className="font-semibold mb-3 flex items-center gap-2">
                              <Icon name="track_changes" size={18} className="text-tertiary" />
                              {_('Learning Objectives')}
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

                      {d.concept.summary && (
                        <Card className="border-border/60">
                          <CardContent className="p-5">
                            <h2 className="font-semibold mb-3 flex items-center gap-2">
                              <Icon name="notes" size={18} className="text-primary" />
                              {_('Summary')}
                            </h2>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                              {d.concept.summary}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="menu_book" size={18} className="text-primary" />
                            {_('Study Notes')}
                          </h2>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {d.concept.notes}
                          </div>
                        </CardContent>
                      </Card>

                      {d.concept.keyPoints && (
                        <Card className="border-border/60">
                          <CardContent className="p-5">
                            <h2 className="font-semibold mb-3 flex items-center gap-2">
                              <Icon name="lightbulb" size={18} className="text-primary" />
                              {_('Key Points')}
                            </h2>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                              {d.concept.keyPoints}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {d.concept.formulas && (
                        <Card className="border-border/60">
                          <CardContent className="p-5">
                            <h2 className="font-semibold mb-3 flex items-center gap-2">
                              <Icon name="calculate" size={18} className="text-primary" />
                              {_('Formulas')}
                            </h2>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground font-mono">
                              {d.concept.formulas}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {d.concept.examples && (
                        <Card className="border-border/60">
                          <CardContent className="p-5">
                            <h2 className="font-semibold mb-3 flex items-center gap-2">
                              <Icon name="description" size={18} className="text-primary" />
                              {_('Examples')}
                            </h2>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                              {d.concept.examples}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="mindmap" className="mt-4">
                      <ConceptDetailMindMap concept={d.concept} />
                    </TabsContent>

                    <TabsContent value="quiz" className="mt-4">
                      <Card className="border-border/60">
                        <CardContent className="p-6 text-center">
                          <Icon name="bolt" size={48} className="text-primary/50 mx-auto mb-3" />
                          <h2 className="text-title-md font-semibold mb-2">{_('Adaptive Quiz')}</h2>
                          <p className="text-sm text-muted-foreground mb-4">
                            {_('Take an adaptive quiz that adjusts to your skill level. Questions are selected from')} {(d.concept.questionBank || []).length} {_('available questions.')}
                          </p>
                          {progress && (
                            <div className="flex flex-wrap justify-center gap-3 mb-4">
                              {(progress.quizScores || []).length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {_('Best')}: {Math.max(...(progress.quizScores || [0]))}%
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {_('Attempts')}: {progress.quizAttempts || 0}
                              </Badge>
                            </div>
                          )}
                          <Button asChild size="lg">
                            <Link to={`${ROUTES.STUDENT_CONCEPT_QUIZ(conceptId!)}?textbookId=${textbookId}`}>
                              <Icon name="play_arrow" size={18} className="mr-2" />
                              {_('Start Adaptive Quiz')}
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </div>
            );
          }}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
