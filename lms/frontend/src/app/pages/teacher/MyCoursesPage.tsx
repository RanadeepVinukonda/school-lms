import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, Plus, MoreVertical, Edit, Trash2, Copy,
  Archive, AlertCircle, Users, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

interface TeacherCourse {
  id: string;
  title: string;
  subject: string;
  students: number;
  lessons: number;
  status: 'draft' | 'published' | 'archived';
  lastUpdated: Date;
  color: string;
}

const courses: TeacherCourse[] = [
  { id: '1', title: 'Algebra II', subject: 'Math', students: 32, lessons: 24, status: 'published', lastUpdated: new Date(Date.now() - 86400000), color: 'from-violet-500 to-purple-600' },
  { id: '2', title: 'Geometry', subject: 'Math', students: 28, lessons: 18, status: 'published', lastUpdated: new Date(Date.now() - 172800000), color: 'from-blue-500 to-cyan-600' },
  { id: '3', title: 'Calculus Preview', subject: 'Math', students: 0, lessons: 5, status: 'draft', lastUpdated: new Date(Date.now() - 259200000), color: 'from-amber-500 to-orange-600' },
];

const statusColors = { draft: 'bg-muted text-muted-foreground', published: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', archived: 'bg-muted text-muted-foreground' };

function CourseSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-8 w-40" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );
}

export default function MyCoursesPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 600)); return null; },
  });

  if (isLoading) return <CourseSkeleton />;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load courses</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg font-medium">No courses yet</p>
          <p className="text-sm text-muted-foreground">Create your first course to get started.</p>
          <Button asChild><Link to="/teacher/courses"><Plus className="h-4 w-4 mr-2" />Create Course</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="My Courses" description="Manage your courses" canonical="/teacher/courses" />
      <div className="p-4 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-sm text-muted-foreground">{courses.length} courses</p>
        </div>
        <Button asChild><Link to="#"><Plus className="h-4 w-4 mr-2" />Create</Link></Button>
      </div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
        {courses.map(c => (
          <motion.div key={c.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
            <Card className="overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${c.color}`} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{c.title}</h3>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusColors[c.status])}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students} students</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{c.lessons} lessons</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDate(c.lastUpdated)}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link to={`/teacher/courses/${c.id}/manage`}><Edit className="h-4 w-4 mr-2" />Edit</Link></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Course duplicated')}><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.success('Course archived')}><Archive className="h-4 w-4 mr-2" />Archive</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => toast.error('Course deleted')}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  );
}
