import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, AlertCircle, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function GradesSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-32 rounded-xl" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );
}

interface GradeItem {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface SubjectGrade {
  subject: string;
  grade: string;
  percentage: number;
  color: string;
  items: GradeItem[];
}

export default function GradesPage() {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 800)); return null; },
  });

  const subjects: SubjectGrade[] = [
    { subject: 'Algebra II', grade: 'A-', percentage: 90, color: 'text-emerald-500', items: [
      { name: 'Quiz 1', score: 18, maxScore: 20, percentage: 90 },
      { name: 'Homework Set 4', score: 48, maxScore: 50, percentage: 96 },
      { name: 'Midterm', score: 85, maxScore: 100, percentage: 85 },
    ]},
    { subject: 'World History', grade: 'B+', percentage: 87, color: 'text-emerald-500', items: [
      { name: 'Essay 1', score: 42, maxScore: 50, percentage: 84 },
      { name: 'Quiz 2', score: 15, maxScore: 15, percentage: 100 },
    ]},
    { subject: 'Biology 101', grade: 'C+', percentage: 78, color: 'text-amber-500', items: [
      { name: 'Lab Report 1', score: 35, maxScore: 50, percentage: 70 },
      { name: 'Quiz 3', score: 13, maxScore: 15, percentage: 87 },
    ]},
  ];

  const gpa = subjects.reduce((sum, s) => sum + s.percentage, 0) / subjects.length;

  if (isLoading) return <GradesSkeleton />;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load grades</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No grades yet</p>
          <p className="text-sm text-muted-foreground">Grades will appear here once your teacher posts them.</p>
          <Button variant="outline" asChild>Stay tuned</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="My Grades" description="Your academic performance overview" canonical="/grades" />
      <motion.div variants={container} initial="hidden" animate="show" className="p-4 max-w-4xl mx-auto pb-20">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold mb-1">Grades</h1>
        <p className="text-sm text-muted-foreground mb-4">Your academic performance overview</p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 mb-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall GPA</p>
                <p className="text-3xl font-bold">{gpa >= 90 ? 'A' : gpa >= 80 ? 'B' : gpa >= 70 ? 'C' : 'D'}</p>
                <p className="text-sm text-muted-foreground">{gpa.toFixed(1)}% average</p>
              </div>
              <div className={cn('h-16 w-16 rounded-full flex items-center justify-center', gpa >= 80 ? 'bg-emerald-500/10' : gpa >= 70 ? 'bg-amber-500/10' : 'bg-destructive/10')}>
                <TrendingUp className={cn('h-8 w-8', gpa >= 80 ? 'text-emerald-500' : gpa >= 70 ? 'text-amber-500' : 'text-destructive')} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {subjects.map(subject => (
          <Card
            key={subject.subject}
            className={cn('cursor-pointer transition-all hover:shadow-md', selectedSubject === subject.subject && 'ring-2 ring-primary')}
            onClick={() => setSelectedSubject(selectedSubject === subject.subject ? null : subject.subject)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{subject.subject}</p>
                  <p className="text-xs text-muted-foreground">{subject.items.length} assessments</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-lg font-bold', subject.color)}>{subject.grade}</p>
                  <p className="text-xs text-muted-foreground">{subject.percentage}%</p>
                </div>
              </div>
              <Progress value={subject.percentage} className={cn('h-1.5', subject.percentage >= 80 ? 'bg-emerald-500/20' : subject.percentage >= 70 ? 'bg-amber-500/20' : 'bg-destructive/20')} />

              {selectedSubject === subject.subject && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 space-y-2 overflow-hidden">
                  {subject.items.map(i => (
                    <div key={i.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        {i.percentage >= 80 ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : i.percentage >= 70 ? <TrendingUp className="h-4 w-4 text-amber-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                        <span className="text-sm">{i.name}</span>
                      </div>
                      <span className="text-sm font-medium">{i.score}/{i.maxScore} <span className="text-xs text-muted-foreground">({i.percentage}%)</span></span>
                    </div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>
      </motion.div>
    </>
  );
}
