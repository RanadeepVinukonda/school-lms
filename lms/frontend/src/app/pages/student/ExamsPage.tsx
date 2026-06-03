import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, AlertCircle, Clock, ListChecks } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { mockExams } from '@/lib/mockData';

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ExamsPage() {
  const { data: exams, isLoading, isError, refetch } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => { await new Promise((r) => setTimeout(r, 300)); return mockExams; },
  });

  return (
    <>
      <SEOHead title="Exams" description="View all exams" canonical="/exams" />
      <div className="p-4 max-w-4xl mx-auto pb-20">
        <h1 className="text-2xl font-bold mb-4">Exams</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : isError ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Failed to load exams</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </CardContent></Card>
        ) : !exams || exams.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No exams yet</p>
            <p className="text-sm text-muted-foreground">Exams will appear here once created by your teachers.</p>
          </CardContent></Card>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
            {exams.map(e => (
              <motion.div key={e.id} variants={item}>
                <Link to={`/exams/${e.id}`}>
                  <Card className="hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.title}</p>
                        {e.description && <p className="text-xs text-muted-foreground truncate">{e.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.timeLimit} min</span>
                          <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{e.questions?.length ?? 0} questions</span>
                        </div>
                      </div>
                      <Badge variant={e.status === 'published' ? 'default' : 'secondary'}>{e.status}</Badge>
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