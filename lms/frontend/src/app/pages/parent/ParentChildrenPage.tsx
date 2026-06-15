import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/lib/constants';
import { staggerContainer, cardStackReveal } from '@/lib/motion';
import { getChildren } from '@/services/parentService';

export default function ParentChildrenPage() {
  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['parent-children'],
    queryFn: getChildren,
  });

  return (
    <>
      <SEOHead title="My Children" description="View your linked children" canonical="/parent/children" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-4xl mx-auto pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0} className="mb-8">
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">My Children</h1>
          <p className="text-body-md text-muted-foreground mt-1">View and manage your linked children</p>
        </motion.div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(children) => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {children.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="flex flex-col items-center gap-3 py-12">
                    <Icon name="person_off" size={48} className="text-muted-foreground/40" />
                    <p className="text-lg font-medium">No children linked</p>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      No children are currently linked to your account. Please contact the school administration to link your children.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                children.map((child: any, idx: number) => (
                  <motion.div key={child.id} variants={cardStackReveal} custom={idx}>
                    <Link
                      to={ROUTES.PARENT_CHILD(child.id)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                              <Icon name="person" size={28} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-title-sm font-bold">{child.displayName ?? 'Child'}</p>
                                {child.studentId && (
                                  <Badge variant="secondary" className="text-label-xs">{child.studentId}</Badge>
                                )}
                              </div>
                              <p className="text-label-sm text-muted-foreground mt-0.5">
                                {child.email ?? 'No email'}
                              </p>
                              <div className="flex gap-3 mt-1.5 text-label-xs text-muted-foreground">
                                {child.classId && <span>Class: {child.classId}</span>}
                                {child.rollNo != null && <span>Roll: {child.rollNo}</span>}
                              </div>
                            </div>
                            <Icon name="chevron_right" size={20} className="text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
