import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  ArrowLeft, CheckCircle, Bookmark, BookmarkCheck, Download,
  Play, ChevronLeft, ChevronRight, FileText, AlertCircle, Loader2
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';

function LessonSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <div className="flex gap-3"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 flex-1" /></div>
    </div>
  );
}

export default function LessonViewPage() {
  const { courseId, lessonId } = useParams();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [completing, setCompleting] = useState(false);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 500));
      return null;
    },
  });

  if (isLoading) return <LessonSkeleton />;

  const lesson = {
    id: lessonId,
    title: 'Introduction to Linear Equations',
    courseTitle: 'Algebra II',
    duration: 15,
    videoUrl: null,
    content: '<p>Linear equations are equations of the form <strong>ax + b = 0</strong> where a and b are constants and x is a variable.</p><p>In this lesson, we will cover:</p><ul><li>What is a linear equation?</li><li>Solving simple linear equations</li><li>Checking your solutions</li></ul>',
    attachments: [
      { id: 'a1', name: 'Lesson Notes.pdf', size: '1.2 MB' },
      { id: 'a2', name: 'Practice Sheet.pdf', size: '0.8 MB' },
    ],
    progress: 45,
  };

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load lesson</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Lesson not found</p>
          <Button asChild><Link to={`/student/courses/${courseId}`}>Back to Course</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const handleComplete = async () => {
    setCompleting(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsCompleted(true);
    setCompleting(false);
  };

  return (
    <>
      <SEOHead title={lesson.title} description={`Lesson: ${lesson.title}`} canonical={`/courses/${courseId}/lessons/${lessonId}`} />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/student/courses/${courseId}`}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsBookmarked(!isBookmarked)}>
            {isBookmarked ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Progress value={lesson.progress} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground">{lesson.progress}%</span>
      </div>

      <h1 className="text-xl font-bold mb-4">{lesson.title}</h1>
      <p className="text-sm text-muted-foreground mb-4">{lesson.courseTitle} &middot; {lesson.duration} min</p>

      {lesson.videoUrl ? (
        <div className="aspect-video rounded-xl bg-black mb-4 flex items-center justify-center">
          <Play className="h-12 w-12 text-white/70" />
        </div>
      ) : (
        <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mb-4 flex items-center justify-center">
          <Play className="h-12 w-12 text-primary/40" />
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="p-4 prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content || '') }} />
        </CardContent>
      </Card>

      {lesson.attachments.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">Attachments</p>
            {lesson.attachments.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">{a.name}</span>
                  <span className="text-xs text-muted-foreground">({a.size})</span>
                </div>
                <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1"><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
        <Button
          className="flex-1"
          onClick={handleComplete}
          disabled={isCompleted || completing}
        >
          {completing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : isCompleted ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : null}
          {isCompleted ? 'Completed' : 'Mark Complete'}
        </Button>
        <Button variant="outline" className="flex-1">Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
      </div>
      </motion.div>
    </>
  );
}
