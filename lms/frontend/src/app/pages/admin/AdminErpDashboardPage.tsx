import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { feeService } from '@/services/feeService';
import { noticeService } from '@/services/noticeService';
import { attendanceService } from '@/services/attendanceService';
import { getAllClasses } from '@/services/dataService';
import { timetableService } from '@/services/timetableService';
import { staggerContainer, cardStackReveal } from '@/lib/motion';

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-title-sm font-bold mb-4">{title}</h2>
  );
}

const QUICK_LINKS = [
  { icon: 'payments', label: 'Fee Management', href: '/admin/fee' },
  { icon: 'calendar_month', label: 'Timetable Scheduling', href: '/admin/timetable' },
  { icon: 'fact_check', label: 'Attendance Tracking', href: '/admin/attendance' },
  { icon: 'campaign', label: 'Notice Board', href: '/admin/noticeboard' },
  { icon: 'badge', label: 'HR & Staff Directory', href: '/admin/hr' },
  { icon: 'school', label: 'Google Classroom', href: '/admin/classroom' },
];

export default function AdminErpDashboardPage() {
  const { data: classesData = [] } = useQuery({
    queryKey: ['erp-classes'],
    queryFn: getAllClasses,
  });

  const { data: outstandingRes, isLoading: feeLoading, isError: feeError, refetch: refetchFee } = useQuery({
    queryKey: ['erp-outstanding'],
    queryFn: () => feeService.getOutstandingReport().then((r) => r.data),
  });

  const { data: noticesRes, isLoading: noticeLoading, isError: noticeError, refetch: refetchNotices } = useQuery({
    queryKey: ['erp-notices'],
    queryFn: () => noticeService.getNotices(),
  });

  const { data: timetableRes, isLoading: ttLoading, isError: ttError, refetch: refetchTt } = useQuery({
    queryKey: ['erp-timetable'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        classesData.map((c) => timetableService.getByClass(c.id).then((r) => r.data)),
      );
      return results.reduce((acc: number, r) => {
        if (r.status === 'fulfilled' && r.value) return acc + r.value.length;
        return acc;
      }, 0);
    },
    enabled: classesData.length > 0,
  });

  const { data: attendanceData, isLoading: attLoading, isError: attError, refetch: refetchAtt } = useQuery({
    queryKey: ['erp-attendance'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        classesData.slice(0, 5).map((c) => attendanceService.getAttendanceReport(c.id).then((r) => r.data)),
      );
      let total = 0;
      let present = 0;
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          for (const s of Object.values(r.value.summary || {})) {
            total += (s as any).total || 0;
            present += (s as any).present || 0;
          }
        }
      }
      return { total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    },
    enabled: classesData.length > 0,
  });

  const loading = feeLoading || noticeLoading || ttLoading || attLoading;
  const hasError = feeError || noticeError || ttError || attError;

  const outstandingList = (outstandingRes as any[]) ?? [];
  const noticesList = ((noticesRes as any)?.data as any[]) ?? [];

  const statCards = useMemo(() => [
    {
      icon: 'payments',
      label: 'Fee Collected This Month',
      value: `Rs. ${outstandingList.reduce((s: number, r: any) => s + (r.totalPaid || 0), 0).toLocaleString()}`,
      sub: `${outstandingList.filter((r: any) => r.balance > 0).length} pending`,
    },
    {
      icon: 'receipt_long',
      label: 'Pending Fees',
      value: outstandingList.filter((r: any) => r.balance > 0).length,
      sub: `${outstandingList.length} total students`,
    },
    {
      icon: 'campaign',
      label: 'Active Notices',
      value: noticesList.length,
      sub: noticesList.filter((n: any) => n.priority === 'high').length > 0
        ? `${noticesList.filter((n: any) => n.priority === 'high').length} high priority`
        : 'All clear',
    },
    {
      icon: 'calendar_month',
      label: 'Timetable Entries',
      value: timetableRes ?? 0,
      sub: `${classesData.length} classes`,
    },
    {
      icon: 'fact_check',
      label: 'Attendance Rate',
      value: attendanceData ? `${attendanceData.rate}%` : '--',
      sub: attendanceData ? `${attendanceData.present}/${attendanceData.total} present` : 'Loading...',
    },
    {
      icon: 'school',
      label: 'Total Classes',
      value: classesData.length,
      sub: `${outstandingList.length > 0 ? outstandingList.length : '--'} enrolled students`,
    },
  ], [outstandingList, noticesList, timetableRes, attendanceData, classesData]);

  return (
    <>
      <SEOHead title="ERP Dashboard" description="Consolidated school ERP management dashboard" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">ERP Dashboard</h1>
          <p className="text-body-md text-muted-foreground mt-1">Consolidated operational view of school fees, timetables, attendances, and notice boards</p>
        </motion.div>

        <DataFetchWrapper
          data={statCards}
          isLoading={loading}
          error={hasError ? new Error('Failed to load ERP data') : null}
          onRetry={() => { refetchFee(); refetchNotices(); refetchTt(); refetchAtt(); }}
          loadingType="card"
        >
          {() => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-10"
            >
              {/* Key Metrics */}
              <section>
                <SectionTitle title="Key Metrics" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {statCards.map((s, i) => (
                    <motion.div key={s.label} variants={cardStackReveal} custom={i}>
                      <Card className="border-border/60">
                        <CardContent className="p-6">
                          <p className="text-label-sm text-muted-foreground">{s.label}</p>
                          <p className="text-title-lg font-bold tracking-tight mt-3">{s.value}</p>
                          <p className="text-label-sm text-muted-foreground mt-2">{s.sub}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Quick Actions */}
              <section>
                <SectionTitle title="Quick Actions" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {QUICK_LINKS.map((link, idx) => (
                    <motion.div key={link.href} variants={cardStackReveal} custom={idx + statCards.length}>
                      <Link to={link.href}>
                        <Card className="border-border/60 hover:bg-muted/20 transition-colors">
                          <CardContent className="p-5 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
                              <Icon name={link.icon} size={20} className="text-primary" />
                            </div>
                            <p className="text-title-sm font-bold">{link.label}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Dues + Notices */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section>
                  <SectionTitle title="Outstanding Dues" />
                  <Card className="border-border/60">
                    <CardContent className="p-5">
                      {outstandingList.filter((r: any) => r.balance > 0).length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-muted-foreground text-center">
                          <Icon name="check_circle" size={36} className="opacity-40" />
                          <p className="text-title-sm font-semibold mt-4">No Outstanding Fees</p>
                          <p className="text-label-sm mt-1.5">All accounts are fully paid.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {outstandingList.filter((r: any) => r.balance > 0).slice(0, 5).map((item: any) => (
                            <div key={item.studentId} className="flex items-center justify-between gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                              <div className="min-w-0">
                                <p className="text-title-sm font-bold truncate">{item.studentName || item.studentId}</p>
                                <p className="text-label-sm text-muted-foreground mt-0.5">Due: Rs. {item.totalDue?.toLocaleString()}</p>
                              </div>
                              <Badge variant="destructive" className="text-[10px] font-mono font-bold shrink-0">
                                Rs. {item.balance?.toLocaleString()}
                              </Badge>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link to="/admin/fee">Full Fee Ledger</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionTitle title="Active Notices" />
                  <Card className="border-border/60">
                    <CardContent className="p-5">
                      {noticesList.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-muted-foreground text-center">
                          <Icon name="campaign" size={36} className="opacity-40" />
                          <p className="text-title-sm font-semibold mt-4">No active notices</p>
                          <p className="text-label-sm mt-1.5">Check back later for school updates.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {noticesList.slice(0, 4).map((n: any) => (
                            <div key={n.id} className="pb-4 border-b border-border/40 last:border-0 last:pb-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-title-sm font-bold truncate">{n.title}</p>
                                {n.priority === 'high' && (
                                  <Badge variant="destructive" className="text-[9px] uppercase font-bold px-1.5 py-0">High</Badge>
                                )}
                              </div>
                              <p className="text-label-sm text-muted-foreground line-clamp-2">{n.content}</p>
                              <p className="text-label-xs text-muted-foreground/60 mt-2">{new Date(n.created_at).toLocaleDateString()}</p>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link to="/admin/noticeboard">All Announcements</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </div>
            </motion.div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
