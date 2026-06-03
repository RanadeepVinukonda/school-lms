import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, Calendar } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { mockAssignments, mockTextbooks } from '@/lib/mockData';

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AssignmentsPage() {
  const { data: assignments, isLoading, isError, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return mockAssignments;
    },
  });

  return (
    <>
      <SEOHead title="Assignments" description="View all assignments" canonical="/assignments" />
      <div className="p-4 max-w-4xl mx-auto pb-20">
        <h1 className="text-2xl font-bold mb-4">Assignments</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : isError ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Failed to load assignments</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </CardContent></Card>
        ) : !assignments || assignments.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No assignments yet</p>
            <p className="text-sm text-muted-foreground">Assignments will appear here once created by your teachers.</p>
          </CardContent></Card>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
            {assignments.map(a => {
              const due = new Date(a.dueDate);
              const overdue = due < new Date();
              return (
                <motion.div key={a.id} variants={item}>
                  <Link to={`/assignments/${a.id}`}>
                    <Card className="hover:shadow-md transition-all">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{mockTextbooks.find((tb) => tb.id === a.textbookId)?.title ?? a.textbookId}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{due.toLocaleDateString()}</span>
                            <span>{a.maxPoints} pts</span>
                          </div>
                        </div>
                        <Badge variant={overdue ? 'destructive' : a.status === 'published' ? 'default' : 'secondary'}>
                          {overdue ? 'Overdue' : a.status === 'published' ? 'Open' : a.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </>
  );
}