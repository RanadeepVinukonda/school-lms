import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { mockSubjects, mockTextbooks, mockLessons, mockEnrollments } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';

export default function TextbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['textbook-roadmap', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (!id) return null;
      const textbook = mockTextbooks.find((tb) => tb.id === id);
      if (!textbook) return null;
      const subject = mockSubjects.find((s) => s.id === textbook.subjectId);
      const lessons = mockLessons.filter((l) => l.textbookId === id);
      const enrollment = mockEnrollments.find(
        (e) => e.subjectId === textbook.subjectId,
      );

      const allLessons = textbook.chapters
        .sort((a, b) => a.order - b.order)
        .map((ch) => ({
          ...ch,
          chapterLessons: lessons
            .filter((l) => l.chapterId === ch.id)
            .sort((a, b) => a.order - b.order),
        }));

      const totalChapters = allLessons.length;
      const progressPct = enrollment?.progress ?? 0;
      const completedCount = totalChapters > 0
        ? Math.min(Math.floor((totalChapters * progressPct) / 100), totalChapters - 1)
        : 0;

      const chapters = allLessons.map((ch, idx) => ({
        ...ch,
        status: idx < completedCount ? 'completed' as const
          : idx === completedCount ? 'current' as const
          : 'future' as const,
      }));

      return {
        textbook, subject, chapters,
        totalChapters, completedCount, progressPct,
      };
    },
  });

  const toggleChapter = (chapterId: string) => {
    setExpandedChapter((prev) => (prev === chapterId ? null : chapterId));
  };

  return (
    <>
      <SEOHead
        title={data?.textbook?.title ?? 'Textbook'}
        description={`Learning roadmap for ${data?.textbook?.title ?? 'textbook'}`}
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-4xl mx-auto space-y-4 pb-20"
      >
        <Button variant="ghost" size="sm" asChild className="mb-1">
          <Link to={data?.subject ? ROUTES.STUDENT_SUBJECT(data.subject.id) : ROUTES.STUDENT_SUBJECTS} className="gap-2">
            <Icon name="arrow_back" size={16} />
            {data?.subject ? `Back to ${data.subject.name}` : 'Back to Subjects'}
          </Link>
        </Button>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load textbook') : null}
          loadingType="detail"
          emptyMessage="Textbook not found"
          emptyIcon={<Icon name="auto_stories" size={32} />}
          emptyAction={
            <Button asChild>
              <Link to={ROUTES.STUDENT_SUBJECTS}>Back to Subjects</Link>
            </Button>
          }
          onRetry={() => refetch()}
          errorTitle="Failed to load textbook"
        >
          {(d) => (
            <div className="space-y-4">
              {/* Header */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated" className="overflow-hidden">
                  <div className="h-36 flex items-end p-6 relative" style={{ backgroundColor: `${d.subject?.color || '#6366f1'}20` }}>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: d.subject?.color || '#6366f1' }}>
                        <Icon name="auto_stories" size={28} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h1 className="text-xl font-bold">{d.textbook.title}</h1>
                        <p className="text-body-md text-muted-foreground">
                          {d.subject?.name}
                        </p>
                        {d.textbook.description && (
                          <p className="text-body-sm text-muted-foreground mt-0.5">{d.textbook.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Progress */}
              <motion.div variants={listItem} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
                <Card variant="elevated">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-title-sm font-semibold">Your Progress</span>
                      <span className="text-body-sm text-muted-foreground">
                        {d.completedCount}/{d.totalChapters} chapters
                      </span>
                    </div>
                    <Progress value={d.progressPct} size="lg" />
                    <p className="text-body-sm text-muted-foreground mt-1">
                      {d.progressPct}% complete
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Learning Roadmap */}
              <div className="relative pl-16">
                {/* Vertical timeline line */}
                <div className="absolute left-[31px] top-3 bottom-3 w-0.5 bg-surface-variant" />

                {d.chapters.map((ch, ci) => (
                  <motion.div
                    key={ch.id}
                    variants={listItem}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.1 + ci * 0.06 }}
                    className="relative pb-5"
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute -left-[38px] top-4 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full',
                        ch.status === 'completed' && 'bg-success-container',
                        ch.status === 'current' && 'bg-primary-container',
                        ch.status === 'future' && 'bg-surface-variant',
                      )}
                    >
                      {ch.status === 'current' && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>

                    {/* Status icon */}
                    <div className="absolute -left-[58px] top-3.5 flex w-4 items-center justify-center">
                      {ch.status === 'completed' && <Icon name="check_circle" size={16} className="text-success" />}
                      {ch.status === 'current' && <Icon name="arrow_forward" size={16} className="text-primary" />}
                    </div>

                    {/* Chapter card — click to expand */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleChapter(ch.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleChapter(ch.id); }}
                      className={cn(
                        'rounded-xl border bg-card text-card-foreground transition-all duration-200 cursor-pointer',
                        'hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        ch.status === 'future' && 'opacity-50',
                        expandedChapter === ch.id && 'ring-2 ring-primary shadow-elevation-2',
                      )}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-label-sm font-semibold uppercase tracking-wider',
                                ch.status === 'completed' && 'text-success',
                                ch.status === 'current' && 'text-primary',
                                ch.status === 'future' && 'text-muted-foreground',
                              )}
                            >
                              Chapter {ch.order}
                            </p>
                            <p
                              className={cn(
                                'text-title-md font-bold mt-0.5',
                                ch.status === 'future' && 'text-muted-foreground',
                              )}
                            >
                              {ch.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Link to={ROUTES.STUDENT_CHAPTER(d.textbook.id, ch.id)} onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Icon name="menu_book" size={13} />
                                Study
                              </Button>
                            </Link>
                            <Badge variant="secondary" className="text-[10px]">
                              {ch.chapterLessons.length}{' '}
                              {ch.chapterLessons.length === 1 ? 'lesson' : 'lessons'}
                            </Badge>
                            <Icon
                              name={expandedChapter === ch.id ? 'expand_less' : 'expand_more'}
                              size={18}
                              className="text-muted-foreground"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expandable lessons */}
                      <AnimatePresence initial={false}>
                        {expandedChapter === ch.id && (
                          <motion.div
                            key={`lessons-${ch.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 border-t border-border space-y-1">
                              {ch.chapterLessons.length === 0 ? (
                                <p className="text-body-sm text-muted-foreground italic py-2">
                                  No lessons published yet.
                                </p>
                              ) : (
                                ch.chapterLessons.map((lesson) => (
                                  <Link
                                    key={lesson.id}
                                    to={ROUTES.STUDENT_LESSON(lesson.id)}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
                                  >
                                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                      <Icon
                                        name={lesson.contentType === 'video' ? 'play_circle' : 'article'}
                                        size={18}
                                        className="text-primary"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {lesson.title}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-body-sm text-muted-foreground flex items-center gap-1">
                                        <Icon name="schedule" size={12} />
                                        {lesson.duration} min
                                      </span>
                                      <Badge variant="outline" className="text-[10px]">
                                        {lesson.contentType === 'video' ? 'Video' : 'Article'}
                                      </Badge>
                                    </div>
                                  </Link>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
