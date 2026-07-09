import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { staggerContainer, cardStackReveal } from '@/lib/motion';
import { getChildren } from '@/services/parentService';
import { formatDate } from '@/lib/format';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';

function SectionTitle({ label, title }: { label: string; title: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.05, 0, 0.133333, 0.06] }}
      className="mb-6"
    >
      <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{label}</p>
      <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{title}</h2>
    </motion.div>
  );
}

export default function ParentDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['parent-dashboard', user?.id],
    queryFn: async () => {
      const children = await getChildren();
      return { children };
    },
  });

  // Realtime: auto-refresh when children's grades change
  useRealtimeSubscription({
    table: 'grades',
    event: 'INSERT',
    callback: () => { refetch(); },
  });

  useRealtimeInvalidation([{ table: 'grades', queryKey: ['parent-dashboard', user?.id] }]);

  const parentName = user?.displayName?.split(' ')[0] ?? 'Parent';
  const childCount = data?.children?.length ?? 0;

  return (
    <>
      <SEOHead title="Parent Dashboard" description="Monitor your child's progress" canonical="/parent/dashboard" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-20"
            >
              <section>
                <motion.div variants={cardStackReveal} custom={0}>
                  <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">
                    Welcome, {parentName}
                  </h1>
                  <p className="text-body-md text-muted-foreground mt-1">Stay informed about your child&apos;s learning journey</p>
                </motion.div>
              </section>

              <section>
                <SectionTitle label="Overview" title="Your family" />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="border-border/60">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                          <Icon name="group" size={22} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-display-xs font-bold tabular-nums leading-none mb-1">{childCount}</p>
                          <p className="text-label-sm text-muted-foreground">Linked Children</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="border-border/60">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                          <Icon name="analytics" size={22} className="text-secondary" />
                        </div>
                        <div>
                          <p className="text-display-xs font-bold tabular-nums leading-none mb-1">
                            {d.children.length > 0 ? 'Active' : 'N/A'}
                          </p>
                          <p className="text-label-sm text-muted-foreground">Monitoring Status</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="border-border/60">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-success-container flex items-center justify-center shrink-0">
                          <Icon name="fact_check" size={22} className="text-success" />
                        </div>
                        <div>
                          <p className="text-display-xs font-bold tabular-nums leading-none mb-1">
                            <Link to={ROUTES.PARENT_REPORTS} className="hover:underline">View</Link>
                          </p>
                          <p className="text-label-sm text-muted-foreground">Weekly Reports</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </section>

              {d.children.length > 0 && (
                <section>
                  <SectionTitle label="Children" title="Your linked children" />
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-60px' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {d.children.map((child: any) => (
                      <motion.div key={child.id} variants={cardStackReveal} custom={0}>
                        <Link
                          to={ROUTES.PARENT_CHILD(child.id)}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block"
                        >
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/60">
                            <CardContent className="p-5">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                                  <Icon name="person" size={22} className="text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-title-sm font-bold">{child.displayName ?? 'Child'}</p>
                                  <p className="text-label-sm text-muted-foreground mt-0.5">
                                    {child.classInfo ? `${child.classInfo.grade ?? ''}${child.classInfo.section ?? ''}`.trim() || child.classInfo.name : 'No class assigned'}
                                  </p>
                                </div>
                                <Icon name="chevron_right" size={20} className="text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </section>
              )}

              <section>
                <SectionTitle label="Actions" title="Quick links" />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {[
                    { icon: 'group', label: 'View Children', href: ROUTES.PARENT_CHILDREN, bg: 'bg-primary-container', color: 'text-primary' },
                    { icon: 'analytics', label: 'Reports', href: ROUTES.PARENT_REPORTS, bg: 'bg-secondary-container', color: 'text-secondary' },
                    { icon: 'person', label: 'My Profile', href: ROUTES.PARENT_PROFILE, bg: 'bg-success-container', color: 'text-success' },
                    { icon: 'notifications', label: 'Notifications', href: ROUTES.NOTIFICATIONS, bg: 'bg-warning-container', color: 'text-warning' },
                  ].map((action) => (
                    <motion.div key={action.label} variants={cardStackReveal} custom={0}>
                      <Link to={action.href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/60">
                          <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                            <div className={`h-12 w-12 rounded-xl ${action.bg} flex items-center justify-center`}>
                              <Icon name={action.icon} size={24} className={action.color} />
                            </div>
                            <p className="text-title-sm font-bold">{action.label}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
