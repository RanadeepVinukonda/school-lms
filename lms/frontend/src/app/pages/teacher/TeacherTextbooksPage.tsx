import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getAllTextbooks } from '@/services/textbookService';
import { getAllSubjects } from '@/services/dataService';

export default function TeacherTextbooksPage() {
  const { data: textbooksWithSubjects, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-textbooks'],
    queryFn: async () => {
      const [result, allSubjects] = await Promise.all([getAllTextbooks(), getAllSubjects()]);
      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      return (result.filter((tb) => tb.status !== 'processing')).map((tb) => ({
        ...tb,
        subject: subjectMap.get(tb.subjectId) ?? null,
        chapterCount: tb.chapterCount ?? 0,
        lessonCount: 0,
      }));
    },
  });

  const list = textbooksWithSubjects ?? [];

  return (
    <>
      <SEOHead title="Textbooks" description="Manage your textbooks and chapters" canonical="/teacher/textbooks" />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-6 pb-20"
      >
        <motion.div
          variants={listItem}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-headline-sm">Textbooks</h1>
            <p className="text-sm text-muted-foreground">
              {list.length} textbook{list.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/teacher/textbooks/upload" className="gap-1">
                <Icon name="upload" size={16} />
                Upload
              </Link>
            </Button>
            <Button asChild>
              <Link to="/teacher/textbooks/create" className="gap-1">
                <Icon name="add" size={16} />
                Create Textbook
              </Link>
            </Button>
          </div>
        </motion.div>

        <DataFetchWrapper
          data={textbooksWithSubjects}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          loadingType="list"
          emptyMessage="No textbooks yet"
          emptyAction={
            <Button asChild>
              <Link to="/teacher/textbooks/create" className="gap-1">
                <Icon name="add" size={16} />
                Create Textbook
              </Link>
            </Button>
          }
        >
          {(textbookList) => (
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-4">
              {textbookList.map((tb) => (
                <motion.div key={tb.id} variants={listItem}>
                  <Card variant="elevated" className="overflow-hidden">
                    <div className="h-1.5 w-full" style={{ backgroundColor: tb.subject?.color ?? '#6366f1' }} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div
                          className="h-13 w-13 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${tb.subject?.color ?? '#6366f1'}15` }}
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
                                <Link to={`/teacher/textbooks/${tb.id}`} className="gap-1">
                                  <Icon name="edit" size={15} />
                                  Edit
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/teacher/textbooks/${tb.id}/chapters/create`} className="gap-1">
                                  <Icon name="add" size={15} />
                                  Add Chapter
                                </Link>
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{tb.description}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <Badge variant="secondary" className="text-[10px]">
                              <Icon name="chapter" size={11} className="mr-1" />
                              {tb.chapterCount} chapter{tb.chapterCount !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              <Icon name="play_lesson" size={11} className="mr-1" />
                              {tb.lessonCount} lesson{tb.lessonCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
