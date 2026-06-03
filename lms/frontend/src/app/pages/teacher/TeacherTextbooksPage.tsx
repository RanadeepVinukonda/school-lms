import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { mockTextbooks, mockSubjects } from '@/lib/mockData';

function TextbooksSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="error" size={28} className="text-destructive" />
        </div>
        <p className="text-lg font-semibold">Failed to load textbooks</p>
        <p className="text-sm text-muted-foreground">
          Please check your connection and try again
        </p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyDisplay() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <Icon name="menu_book" size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium">No textbooks yet</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Create your first textbook to organize lessons and chapters for your
          students.
        </p>
        <Button asChild>
          <Link to="/teacher/textbooks/create" className="gap-1">
            <Icon name="add" size={16} />
            Create Textbook
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TeacherTextbooksPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-textbooks'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const textbooksWithSubjects = useMemo(
    () =>
      mockTextbooks.map((tb) => ({
        ...tb,
        subject: mockSubjects.find((s) => s.id === tb.subjectId) ?? null,
      })),
    [],
  );

  if (isLoading) return <TextbooksSkeleton />;

  if (isError) return <ErrorDisplay onRetry={() => refetch()} />;

  return (
    <>
      <SEOHead
        title="Textbooks"
        description="Manage your textbooks and chapters"
        canonical="/teacher/textbooks"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-6 pb-20"
      >
        {/* Header */}
        <motion.div
          variants={listItem}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold">Textbooks</h1>
            <p className="text-sm text-muted-foreground">
              {textbooksWithSubjects.length} textbook
              {textbooksWithSubjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button asChild>
            <Link to="/teacher/textbooks/create" className="gap-1">
              <Icon name="add" size={16} />
              Create Textbook
            </Link>
          </Button>
        </motion.div>

        {/* Content */}
        {textbooksWithSubjects.length === 0 ? (
          <EmptyDisplay />
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {textbooksWithSubjects.map((tb) => (
              <motion.div key={tb.id} variants={listItem}>
                <Card className="hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div
                    className="h-1.5 w-full"
                    style={{
                      backgroundColor: tb.subject?.color ?? '#6366f1',
                    }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="h-13 w-13 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${tb.subject?.color ?? '#6366f1'}15`,
                        }}
                      >
                        <span style={{ color: tb.subject?.color ?? '#6366f1' }}>
                          <Icon name="menu_book" size={26} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{tb.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {tb.subject?.name ?? 'Unknown Subject'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                to={`/teacher/textbooks/${tb.id}`}
                                className="gap-1"
                              >
                                <Icon name="edit" size={15} />
                                Edit
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                to={`/teacher/textbooks/${tb.id}/chapters/create`}
                                className="gap-1"
                              >
                                <Icon name="add" size={15} />
                                Add Chapter
                              </Link>
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tb.description}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="secondary" className="text-[10px]">
                            <Icon name="chapter" size={11} className="mr-1" />
                            {tb.chapters.length} chapter
                            {tb.chapters.length !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            <Icon name="play_lesson" size={11} className="mr-1" />
                            {tb.chapters.reduce(
                              (s, ch) => s + ch.lessonCount,
                              0,
                            )}{' '}
                            lessons
                          </Badge>
                        </div>

                        {/* Chapter List Preview */}
                        {tb.chapters.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-1.5">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                              Chapters
                            </p>
                            {tb.chapters.map((ch) => (
                              <div
                                key={ch.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Icon
                                  name="chapter"
                                  size={14}
                                  className="text-muted-foreground/50"
                                />
                                <span className="text-muted-foreground">
                                  {ch.order}. {ch.title}
                                </span>
                                <span className="text-xs text-muted-foreground/50 ml-auto">
                                  {ch.lessonCount} lesson
                                  {ch.lessonCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
