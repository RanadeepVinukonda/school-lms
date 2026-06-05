import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook } from '@/services/textbookService';
import { getSubject } from '@/services/dataService';

export default function StudentChapterPage() {
  const { textbookId, chapterId } = useParams<{ textbookId: string; chapterId: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-chapter', textbookId],
    queryFn: async () => {
      const fb = await getTextbook(textbookId!);
      if (!fb) throw new Error('Textbook not found');
      const subject = await getSubject(fb.subjectId);
      return { textbook: fb, subject };
    },
    enabled: !!textbookId,
  });

  const chapterData = useMemo(() => {
    if (!data) return null;
    const ch = data.textbook.chapters.find((c) => c.id === chapterId || c.id === `ch_${textbookId}_${chapterId}`);
    if (!ch) return null;
    return { chapter: ch, subject: data.subject };
  }, [data, chapterId, textbookId]);

  return (
    <>
      <SEOHead title={chapterData?.chapter?.title || 'Chapter'} description={chapterData?.chapter?.description || `Study ${chapterData?.chapter?.title || 'chapter'}`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        <Link to={ROUTES.STUDENT_TEXTBOOK(textbookId!)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icon name="arrow_back" size={16} />
          Back to textbook
        </Link>

        <DataFetchWrapper
          data={chapterData}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load chapter') : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage="Chapter not found"
        >
          {(d) => { const ch = d.chapter; const subj = d.subject; return (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {subj && <Badge variant="secondary" style={{ backgroundColor: `${subj.color}20`, color: subj.color }}>{subj.name}</Badge>}
                  <span className="text-sm text-muted-foreground">Chapter {ch.order + 1}</span>
                </div>
                <h1 className="text-headline-sm font-bold">{ch.title}</h1>
                {ch.description && <p className="text-muted-foreground mt-1">{ch.description}</p>}
              </div>

              {ch.concepts && ch.concepts.length > 0 && (
                <div>
                  <h2 className="text-title-md font-semibold mb-3">Concepts ({ch.concepts.length})</h2>
                  <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
                    {ch.concepts.map((concept, i) => (
                      <motion.div key={concept.id} variants={listItem}>
                        <Link to={`${ROUTES.STUDENT_CONCEPT(concept.id)}?textbookId=${textbookId}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-sm font-bold text-primary">{i + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium">{concept.title}</h3>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{concept.summary}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge variant="outline" className="text-[10px] capitalize">
                                      {concept.difficulty}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      <Icon name="schedule" size={12} className="inline mr-0.5" />
                                      {concept.estimatedMinutes} min
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      <Icon name="quiz" size={12} className="inline mr-0.5" />
                                      {concept.questionBank?.length || 0} questions
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      <Icon name="smart_display" size={12} className="inline mr-0.5" />
                                      {concept.videos?.length || 0} videos
                                    </span>
                                  </div>
                                </div>
                                <Icon name="chevron_right" size={18} className="text-muted-foreground/50 flex-shrink-0 mt-2" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}

              {(!ch.concepts || ch.concepts.length === 0) && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Icon name="menu_book" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No concepts generated yet. The AI is still processing this chapter.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ); }}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
