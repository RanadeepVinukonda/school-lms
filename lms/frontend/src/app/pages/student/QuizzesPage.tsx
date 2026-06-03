import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle, Clock, ListChecks, Loader2 } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { mockQuizzes } from '@/lib/mockData';

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function QuizzesPage() {
  const { data: quizzes, isLoading, isError, refetch } = useQuery({
    queryKey: ['quizzes'],
    queryFn: async () => { await new Promise((r) => setTimeout(r, 300)); return mockQuizzes; },
  });

  return (
    <>
      <SEOHead title="Quizzes" description="View all quizzes" canonical="/quizzes" />
      <div className="p-4 max-w-4xl mx-auto pb-20">
        <h1 className="text-2xl font-bold mb-4">Quizzes</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : isError ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Failed to load quizzes</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </CardContent></Card>
        ) : !quizzes || quizzes.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No quizzes yet</p>
            <p className="text-sm text-muted-foreground">Quizzes will appear here once created by your teachers.</p>
          </CardContent></Card>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
            {quizzes.map(q => (
              <motion.div key={q.id} variants={item}>
                <Link to={`/quizzes/${q.id}`}>
                  <Card className="hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{q.title}</p>
                        {q.description && <p className="text-xs text-muted-foreground truncate">{q.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimit} min</span>
                          <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{q.questions?.length ?? 0} questions</span>
                        </div>
                      </div>
                      <Badge variant={q.status === 'published' ? 'default' : 'secondary'}>{q.status}</Badge>
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