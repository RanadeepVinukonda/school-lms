import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, Users, Star, Plus, ArrowRight, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { OptionsSelect } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const subjects = ['All', 'Math', 'Science', 'English', 'History', 'Art'];
const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name (A-Z)' },
];

function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-36" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /></div>
        <Skeleton className="h-8 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-4 py-16">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <p className="text-lg font-medium">Failed to load courses</p>
      <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
      <Button variant="outline" onClick={onRetry}>Try Again</Button>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-4 py-16">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium">No courses found</p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {search ? `No courses matching "${search}". Try a different search term.` : 'No courses available yet. Check back later.'}
      </p>
      {search && <Button variant="outline" onClick={() => {}}>Clear Search</Button>}
    </div>
  );
}

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const [sort, setSort] = useState('popular');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses', subject, sort],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1000));
      return [];
    },
  });

  const courses = [
    { id: '1', title: 'Algebra II', teacher: 'Mrs. Johnson', subject: 'Math', rating: 4.8, students: 32, progress: 65, enrolled: true, color: 'from-violet-500 to-purple-600' },
    { id: '2', title: 'World History', teacher: 'Mr. Chen', subject: 'History', rating: 4.6, students: 28, progress: 0, enrolled: false, color: 'from-blue-500 to-cyan-600' },
    { id: '3', title: 'Biology 101', teacher: 'Dr. Patel', subject: 'Science', rating: 4.9, students: 35, progress: 80, enrolled: true, color: 'from-emerald-500 to-teal-600' },
    { id: '4', title: 'English Literature', teacher: 'Ms. Williams', subject: 'English', rating: 4.5, students: 25, progress: 0, enrolled: false, color: 'from-rose-500 to-pink-600' },
    { id: '5', title: 'Geometry', teacher: 'Mrs. Johnson', subject: 'Math', rating: 4.7, students: 30, progress: 0, enrolled: false, color: 'from-amber-500 to-orange-600' },
    { id: '6', title: 'Ancient Civilizations', teacher: 'Mr. Chen', subject: 'History', rating: 4.4, students: 22, progress: 0, enrolled: false, color: 'from-indigo-500 to-blue-600' },
  ];

  return (
    <>
      <SEOHead title="Course Catalog" description="Browse available courses" canonical="/courses" />
      <div className="p-4 max-w-5xl mx-auto space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Course Catalog</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {subjects.map(s => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              subject === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{courses.length} courses</p>
        <OptionsSelect
          options={sortOptions}
          value={sort}
          onChange={(v: string) => setSort(v)}
          className="w-36"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <CourseCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {courses.map(c => (
            <motion.div
              key={c.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            >
              <Link to={`/student/courses/${c.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all h-full group">
                  <div className={`h-32 bg-gradient-to-br ${c.color} flex items-end p-4`}>
                    <h3 className="text-white font-bold text-lg">{c.title}</h3>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{c.teacher}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{c.rating}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students}</span>
                      <Badge variant="secondary" className="text-xs">{c.subject}</Badge>
                    </div>
                    {c.enrolled ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{c.progress}%</span>
                        </div>
                        <Progress value={c.progress} className="h-1.5" />
                      </div>
                    ) : (
                      <Button className="w-full" size="sm">
                        <Plus className="h-4 w-4 mr-1" />Enroll
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
    </>
  );
}
