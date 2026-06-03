import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Clock, FileText, Play, CheckCircle,
  Lock, Download, Video, AlertCircle, ChevronDown, ChevronRight,
  Star, Users, GraduationCap
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid grid-cols-4 gap-2"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /></div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [expandedModules, setExpandedModules] = useState<string[]>(['1']);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 800));
      return null;
    },
  });

  const toggleModule = (id: string) => {
    setExpandedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  if (isLoading) return <DetailSkeleton />;

  const course = {
    id: courseId,
    title: 'Algebra II',
    teacher: 'Mrs. Johnson',
    rating: 4.8,
    studentsCount: 32,
    progress: 65,
    color: 'from-violet-500 to-purple-600',
    lessonsCount: 24,
    totalTime: 480,
    assignmentsCount: 8,
    quizzesCount: 4,
    modules: [
      {
        id: '1', title: 'Linear Equations', order: 1,
        lessons: [
          { id: 'l1', title: 'Introduction to Linear Equations', duration: 15, type: 'video' as const, completed: true, locked: false },
          { id: 'l2', title: 'Solving Simple Equations', duration: 20, type: 'document' as const, completed: false, locked: false },
          { id: 'l3', title: 'Advanced Problem Solving', duration: 25, type: 'quiz' as const, completed: false, locked: true },
        ],
      },
      {
        id: '2', title: 'Quadratic Functions', order: 2,
        lessons: [
          { id: 'l4', title: 'Graphing Parabolas', duration: 20, type: 'video' as const, completed: false, locked: true },
        ],
      },
    ],
    assignments: [
      { id: 'a1', title: 'Homework Set 5', due: '2026-06-10', points: 50 },
      { id: 'a2', title: 'Midterm Review', due: '2026-06-15', points: 100 },
    ],
    resources: [
      { id: 'r1', name: 'Formula Sheet.pdf', size: '2.4 MB' },
      { id: 'r2', name: 'Practice Problems.pdf', size: '1.1 MB' },
    ],
  };

  if (isError) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Failed to load course</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Course not found</p>
            <Button asChild><Link to="/student/courses">Browse Courses</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'quiz': return <GraduationCap className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <>
      <SEOHead title={course.title} description={`${course.title} course page`} canonical={`/courses/${courseId}`} />
      <div className="p-4 max-w-4xl mx-auto pb-20">
      <Button variant="ghost" size="sm" asChild className="mb-3">
        <Link to="/student/courses"><ArrowLeft className="h-4 w-4 mr-1" />Back to Courses</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className={`h-44 rounded-xl bg-gradient-to-br ${course.color} flex items-end p-5 mb-4`}>
          <div className="text-white">
            <h1 className="text-xl font-bold">{course.title}</h1>
            <p className="text-sm opacity-90">{course.teacher}</p>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400" />{course.rating}</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.studentsCount} students</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Progress value={course.progress} className="flex-1 h-2" />
          <span className="text-sm font-medium">{course.progress}%</span>
        </div>
        <Button className="w-full mb-4"><Play className="h-4 w-4 mr-2" />Continue Learning</Button>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: BookOpen, label: 'Lessons', value: course.lessonsCount },
            { icon: Clock, label: 'Hours', value: Math.round(course.totalTime / 60) },
            { icon: FileText, label: 'Assignments', value: course.assignmentsCount },
            { icon: GraduationCap, label: 'Quizzes', value: course.quizzesCount },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <s.icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="content">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
            <TabsTrigger value="assignments" className="flex-1">Assignments</TabsTrigger>
            <TabsTrigger value="resources" className="flex-1">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-2 mt-3">
            {course.modules.map(mod => (
              <Card key={mod.id}>
                <button onClick={() => toggleModule(mod.id)} className="w-full p-4 flex items-center justify-between text-left">
                  <div>
                    <p className="font-medium text-sm">Module {mod.order}: {mod.title}</p>
                    <p className="text-xs text-muted-foreground">{mod.lessons.length} lessons</p>
                  </div>
                  {expandedModules.includes(mod.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {expandedModules.includes(mod.id) && (
                  <div className="px-4 pb-3 space-y-1">
                    {mod.lessons.map(l => (
                      <Link
                        key={l.id}
                        to={l.locked ? '#' : `/student/courses/${course.id}/lessons/${l.id}`}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg text-sm transition-colors',
                          l.locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent',
                        )}
                      >
                        {l.completed ? <CheckCircle className="h-4 w-4 text-emerald-500" /> :
                         l.locked ? <Lock className="h-4 w-4 text-muted-foreground" /> :
                         <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />}
                        <div className="flex-1 min-w-0">
                          <span className={cn(l.locked && 'text-muted-foreground')}>{l.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {lessonIcon(l.type)}
                          <span>{l.duration}m</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-2 mt-3">
            {course.assignments.map(a => (
              <Link key={a.id} to={`/student/assignments/${a.id}`}>
                <Card className="hover:bg-accent transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">Due {a.due} &middot; {a.points} pts</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          <TabsContent value="resources" className="space-y-2 mt-3">
            {course.resources.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.size}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
    </>
  );
}
