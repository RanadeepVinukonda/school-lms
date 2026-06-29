import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/Icon';
import api from '@/services/api';

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  completed: number;
  total: number;
  percentage: number;
}

export function StudentProgressTracker({ classIds }: { classIds: string[] }) {
  const { data: progress, isLoading } = useQuery({
    queryKey: ['student-progress', classIds],
    queryFn: async () => {
      const results: SubjectProgress[] = [];
      for (const classId of classIds) {
        const subjects = await api.get(`/subjects/by-class/${classId}`).then((r) => r.data.data ?? []);
        for (const subject of subjects) {
          const prog = await api.get(`/concept-progress/subject/${subject.id}/class/${classId}`)
            .then((r) => r.data.data)
            .catch(() => ({ completed: 0, total: 0 }));
          results.push({
            subjectId: subject.id,
            subjectName: subject.name,
            completed: prog.completed || 0,
            total: prog.total || 0,
            percentage: prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0,
          });
        }
      }
      return results;
    },
    enabled: classIds.length > 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Subject Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!progress || progress.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-title-sm flex items-center gap-2">
          <Icon name="trending_up" size={18} className="text-primary" />
          Subject Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.map((subject) => (
          <motion.div
            key={subject.subjectId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{subject.subjectName}</span>
              <span className="text-label-xs text-muted-foreground shrink-0 ml-2">
                {subject.completed}/{subject.total} concepts
              </span>
            </div>
            <div className="relative">
              <Progress value={subject.percentage} className="h-2" />
              <span className="absolute -top-4 right-0 text-[10px] font-medium text-muted-foreground">
                {subject.percentage}%
              </span>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
