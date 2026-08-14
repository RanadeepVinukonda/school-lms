import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { ConceptMindMap } from '@/components/teacher/ConceptMindMap';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getAllConceptReleases } from '@/services/textbookService';
import { getSubject } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import type { ConceptRelease } from '@/types/textbook';

export default function StudentChapterPage() {
  const { _ } = useTranslation();
  const { textbookId, chapterId } = useParams<{ textbookId: string; chapterId: string }>();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-chapter', textbookId, chapterId],
    queryFn: async () => {
      if (!textbookId || !chapterId) throw new Error('Missing params');
      const fb = await getTextbook(textbookId);
      if (!fb) throw new Error('Textbook not found');

      const userClassId = useAuthStore.getState().user?.classId || '';
      const classId = userClassId || fb.classId || '';
      const [chapters, releases] = await Promise.all([
        getChaptersForTextbook(textbookId),
        getAllConceptReleases(classId, textbookId),
      ]);
      const subject = await getSubject(fb.subjectId);
      const ch = chapters.find((c) => c.id === chapterId);
      if (!ch) throw new Error('Chapter not found');
      const concepts = await getConceptsForChapter(textbookId, chapterId);
      const releaseMap = new Map(releases.map((r) => [r.conceptId, r]));
      return { textbook: fb, subject, chapter: { ...ch, concepts }, releaseMap };
    },
    enabled: !!textbookId && !!chapterId,
  });

  function getReleaseBadge(release: ConceptRelease | undefined) {
    if (!release) {
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">{_('Locked')}</Badge>;
    }
    if (release.mindMapReleased) {
      return (
        <Badge variant="outline" className="text-[10px] text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
          {_('Released')}
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">{_('Locked')}</Badge>;
  }

  return (
    <>
      <SEOHead title={data?.chapter?.title || _('Chapter')} description={data?.chapter?.description || `${_('Study')} ${data?.chapter?.title || _('chapter')}`} />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <div>
          <Link to={ROUTES.STUDENT_TEXTBOOK(textbookId!)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Icon name="arrow_back" size={16} />
            {_('Back to textbook')}
          </Link>
        </div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error(_('Failed to load chapter')) : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage={_('Chapter not found')}
        >
          {(d) => {
            const ch = d.chapter;
            const subj = d.subject;
            const releaseMap = d.releaseMap;
            const concepts = (ch as any).concepts ?? [];
            return (
              <div className="space-y-16">
                <div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {subj && <Badge variant="secondary" style={{ backgroundColor: `${subj.color}20`, color: subj.color }}>{subj.name}</Badge>}
                      <span className="text-sm text-muted-foreground">{_('Chapter')} {(ch as any).order + 1}</span>
                    </div>
                    <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{(ch as any).title}</h1>
                    {(ch as any).description && <p className="text-muted-foreground mt-1">{(ch as any).description}</p>}
                  </div>
                </div>

                {concepts.length > 0 && (
                  <div>
                    <Tabs defaultValue="list">
                      <TabsList className="w-full overflow-x-auto inline-flex">
                        <TabsTrigger value="list"><Icon name="list" size={14} className="mr-1" />{_('List')}</TabsTrigger>
                        <TabsTrigger value="mindmap"><Icon name="account_tree" size={14} className="mr-1" />{_('Mind Map')}</TabsTrigger>
                      </TabsList>

                      <TabsContent value="list">
                        <div className="mb-6 mt-4">
                          <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('LESSONS')}</p>
                          <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Concepts')} ({concepts.length})</h2>
                        </div>
                        <div




                          className="space-y-3"
                        >
                          {concepts.map((concept: any, i: number) => (
                            <div key={concept.id}>
                              <Link to={`${ROUTES.STUDENT_CONCEPT(concept.id)}?textbookId=${textbookId}`}>
                                <Card className="border-border/60 hover:shadow-md transition-shadow cursor-pointer">
                                  <CardContent className="p-5">
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
                                            {concept.estimatedMinutes} {_('min')}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            <Icon name="quiz" size={12} className="inline mr-0.5" />
                                            {concept.questionBank?.length || 0} {_('questions')}
                                          </span>
                                          {getReleaseBadge(releaseMap.get(concept.id))}
                                        </div>
                                      </div>
                                      <Icon name="chevron_right" size={18} className="text-muted-foreground/50 flex-shrink-0 mt-2" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="mindmap">
                        <div className="mt-4">
                          <ConceptMindMap
                            concepts={concepts}
                            chapterTitle={(ch as any).title}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {concepts.length === 0 && (
                  <div>
                    <Card className="border-border/60">
                      <CardContent className="p-12 text-center">
                        <Icon name="menu_book" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">{_('No concepts generated yet. The AI is still processing this chapter.')}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            );
          }}
        </DataFetchWrapper>
      </div>
    </>
  );
}
