import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { mockUsers, mockClasses, mockNotifications } from '@/lib/mockData';

interface KpiItem {
  icon: string;
  label: string;
  value: string;
  change: string;
  color: string;
  bg: string;
}

const kpis: KpiItem[] = [
  { icon: 'school', label: 'Total Students', value: '3', change: '+3', color: 'text-primary', bg: 'bg-primary-container' },
  { icon: 'badge', label: 'Total Teachers', value: '2', change: '+2', color: 'text-success', bg: 'bg-success-container' },
  { icon: 'class', label: 'Total Classes', value: '2', change: '+2', color: 'text-primary', bg: 'bg-primary-container' },
  { icon: 'menu_book', label: 'Total Subjects', value: '4', change: '+4', color: 'text-warning', bg: 'bg-warning-container' },
  { icon: 'trending_up', label: 'Avg Performance', value: '76%', change: '+5%', color: 'text-error', bg: 'bg-error-container' },
  { icon: 'group', label: 'Active Users', value: '5', change: '100%', color: 'text-primary', bg: 'bg-primary-container' },
];

const quickLinks = [
  { icon: 'person', label: 'Manage Students', href: '/admin/students', color: 'text-primary' },
  { icon: 'badge', label: 'Manage Teachers', href: '/admin/teachers', color: 'text-success' },
  { icon: 'class', label: 'Manage Classes', href: '/admin/classes', color: 'text-primary' },
  { icon: 'menu_book', label: 'Manage Subjects', href: '/admin/subjects', color: 'text-warning' },
];

export default function AdminDashboardPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return null;
    },
  });

  const dashboardData = useMemo(() => {
    const students = Object.values(mockUsers).filter((u) => u.role === 'student');
    const teachers = Object.values(mockUsers).filter((u) => u.role === 'teacher');
    const recentActivity = mockNotifications
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return { students, teachers, recentActivity };
  }, []);

  return (
    <>
      <SEOHead title="Admin Dashboard" description="System administration overview" canonical="/admin/dashboard" />
      <DataFetchWrapper
        data={isLoading || isError ? undefined : dashboardData}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load dashboard') : null}
        onRetry={() => refetch()}
        loadingType="card"
      >
        {(data) => (
          <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem}>
              <h1 className="text-headline-sm">Admin Dashboard</h1>
              <p className="text-sm text-on-surface-variant">
                System overview &mdash; {data.students.length} students, {data.teachers.length} teachers, {mockClasses.length} classes
              </p>
            </motion.div>

            <motion.div
              variants={listItem}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {kpis.map((kpi) => (
                <Card key={kpi.label} variant="elevated">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                        <Icon name={kpi.icon} size={22} className={kpi.color} />
                      </div>
                      <Badge variant={kpi.change.startsWith('+') ? 'success' : 'warning'} className="text-[10px]">
                        {kpi.change}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={listItem}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-md flex items-center gap-2">
                      <Icon name="notifications" size={18} className="text-on-surface-variant" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {data.recentActivity.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-on-surface-variant">
                        <Icon name="notifications_none" size={36} />
                        <p className="text-sm mt-2">No recent activity</p>
                      </div>
                    ) : (
                      data.recentActivity.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-variant/50 transition-colors"
                        >
                          <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-on-surface-variant truncate">{a.message}</p>
                          </div>
                          <span className="text-[10px] text-on-surface-variant shrink-0 mt-0.5">
                            {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={listItem}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-md flex items-center gap-2">
                      <Icon name="quickreply" size={18} className="text-on-surface-variant" />
                      Quick Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {quickLinks.map((link) => (
                      <Button
                        key={link.href}
                        variant="outline"
                        className="w-full justify-start gap-3 h-11"
                        asChild
                      >
                        <Link to={link.href}>
                          <Icon name={link.icon} size={18} className={link.color} />
                          <span>{link.label}</span>
                          <Icon name="chevron_right" size={16} className="ml-auto text-on-surface-variant" />
                        </Link>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </DataFetchWrapper>
    </>
  );
}
