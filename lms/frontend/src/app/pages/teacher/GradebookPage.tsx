import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart3, Search, Download, AlertCircle, ChevronRight,
  Users, TrendingUp, ArrowLeft, Check, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { OptionsSelect } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

interface StudentGrade {
  id: string;
  name: string;
  email: string;
  overall: number;
  assignments: { name: string; score: number; max: number; }[];
  quizzes: { name: string; score: number; max: number; }[];
  exams: { name: string; score: number; max: number; }[];
}

const students: StudentGrade[] = [
  { id: 's1', name: 'Alex M.', email: 'alex@school.edu', overall: 92, assignments: [{ name: 'HW5', score: 45, max: 50 }, { name: 'HW6', score: 48, max: 50 }], quizzes: [{ name: 'Quiz 3', score: 18, max: 20 }], exams: [{ name: 'Midterm', score: 85, max: 100 }] },
  { id: 's2', name: 'Sarah K.', email: 'sarah@school.edu', overall: 87, assignments: [{ name: 'HW5', score: 42, max: 50 }, { name: 'HW6', score: 40, max: 50 }], quizzes: [{ name: 'Quiz 3', score: 15, max: 20 }], exams: [{ name: 'Midterm', score: 90, max: 100 }] },
  { id: 's3', name: 'James W.', email: 'james@school.edu', overall: 73, assignments: [{ name: 'HW5', score: 35, max: 50 }, { name: 'HW6', score: 38, max: 50 }], quizzes: [{ name: 'Quiz 3', score: 12, max: 20 }], exams: [{ name: 'Midterm', score: 70, max: 100 }] },
];

const courseOptions = [
  { value: 'algebra-2', label: 'Algebra II' },
  { value: 'geometry', label: 'Geometry' },
];

function GradeSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export default function GradebookPage() {
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('algebra-2');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['gradebook', course],
    queryFn: async () => { await new Promise(r => setTimeout(r, 600)); return null; },
  });

  if (isLoading) return <GradeSkeleton />;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load gradebook</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No students enrolled</p>
          <p className="text-sm text-muted-foreground">Students will appear here once they enroll in your course.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (selectedStudent) {
    const s = students.find(st => st.id === selectedStudent);
    if (!s) return null;
    const allItems = [...s.assignments.map(a => ({ ...a, type: 'Assignment' as const })), ...s.quizzes.map(q => ({ ...q, type: 'Quiz' as const })), ...s.exams.map(e => ({ ...e, type: 'Exam' as const }))];

    return (
      <div className="p-4 max-w-3xl mx-auto pb-20">
        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Gradebook
        </Button>

        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{s.name}</h2>
                <p className="text-sm text-muted-foreground">{s.email}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{s.overall}%</p>
                <Badge variant={s.overall >= 90 ? 'success' : s.overall >= 80 ? 'default' : s.overall >= 70 ? 'warning' : 'destructive'}>
                  {s.overall >= 90 ? 'A' : s.overall >= 80 ? 'B' : s.overall >= 70 ? 'C' : 'D'}
                </Badge>
              </div>
            </div>
            <Progress value={s.overall} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <div className="space-y-2">
          {allItems.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={item.score}
                    className="w-16 h-8 text-sm text-center"
                  />
                  <span className="text-sm text-muted-foreground">/ {item.max}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.success('Grade updated')}>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <SEOHead title="Gradebook" description="View and manage student grades" canonical="/teacher/gradebook" />
      <div className="p-4 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gradebook</h1>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <OptionsSelect options={courseOptions} value={course} onChange={(v: string) => setCourse(v)} className="flex-1" />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden sm:grid grid-cols-12 gap-2 p-4 text-xs font-medium text-muted-foreground border-b">
            <div className="col-span-4">Student</div>
            <div className="col-span-2 text-center">Assignments</div>
            <div className="col-span-2 text-center">Quizzes</div>
            <div className="col-span-2 text-center">Exams</div>
            <div className="col-span-2 text-center">Overall</div>
          </div>
          <div className="divide-y">
            {filtered.map(s => {
              const avgAssign = s.assignments.reduce((sum, a) => sum + (a.score / a.max * 100), 0) / Math.max(s.assignments.length, 1);
              const avgQuiz = s.quizzes.reduce((sum, q) => sum + (q.score / q.max * 100), 0) / Math.max(s.quizzes.length, 1);
              const avgExam = s.exams.reduce((sum, e) => sum + (e.score / e.max * 100), 0) / Math.max(s.exams.length, 1);
              return (
                <button key={s.id} onClick={() => setSelectedStudent(s.id)} className="w-full grid grid-cols-12 gap-2 p-4 text-sm hover:bg-accent transition-colors text-left">
                  <div className="col-span-12 sm:col-span-4">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-center text-xs flex sm:block items-center gap-1">
                    <span className="sm:hidden text-muted-foreground">Assign: </span>
                    {Math.round(avgAssign)}%
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-center text-xs flex sm:block items-center gap-1">
                    <span className="sm:hidden text-muted-foreground">Quiz: </span>
                    {Math.round(avgQuiz)}%
                  </div>
                  <div className="col-span-4 sm:col-span-2 text-center text-xs flex sm:block items-center gap-1">
                    <span className="sm:hidden text-muted-foreground">Exam: </span>
                    {Math.round(avgExam)}%
                  </div>
                  <div className="col-span-12 sm:col-span-2 text-center mt-2 sm:mt-0">
                    <Badge variant={s.overall >= 90 ? 'success' : s.overall >= 80 ? 'default' : s.overall >= 70 ? 'warning' : 'destructive'} className="text-xs">{s.overall}%</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No students match your search.</p>
      )}
    </div>
    </>
  );
}
