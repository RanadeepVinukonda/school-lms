import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { feeService } from '@/services/feeService';
import { noticeService } from '@/services/noticeService';
import { attendanceService } from '@/services/attendanceService';
import { getAllClasses } from '@/services/dataService';
import { timetableService } from '@/services/timetableService';
import { staggerContainer, cardStackReveal } from '@/lib/motion';

const QUICK_LINKS = [
  {
    icon: 'payments',
    label: 'Fee Management',
    desc: 'Track tuition invoices, collect payments, and view outstanding dues.',
    href: '/admin/fee',
    color: 'text-primary',
    bg: 'bg-primary-container',
  },
  {
    icon: 'calendar_month',
    label: 'Timetable Scheduling',
    desc: 'Configure academic periods, assign classrooms, and match teachers.',
    href: '/admin/timetable',
    color: 'text-success',
    bg: 'bg-success-container',
  },
  {
    icon: 'fact_check',
    label: 'Attendance Tracking',
    desc: 'Audit student daily presences, check-in records, and logs.',
    href: '/admin/attendance',
    color: 'text-info',
    bg: 'bg-info-container',
  },
  {
    icon: 'campaign',
    label: 'Notice Board',
    desc: 'Publish announcements, banners, and general news to students/parents.',
    href: '/admin/noticeboard',
    color: 'text-warning',
    bg: 'bg-warning-container',
  },
  {
    icon: 'badge',
    label: 'HR & Staff Directory',
    desc: 'Manage administrative roles, employee registrations, and profiles.',
    href: '/admin/hr',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    icon: 'school',
    label: 'Google Classroom',
    desc: 'Sync courses, stream assignments, and link external LMS resources.',
    href: '/admin/classroom',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
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
      color: 'text-primary',
      bg: 'bg-primary-container',
    },
    {
      icon: 'receipt_long',
      label: 'Pending Fees',
      value: outstandingList.filter((r: any) => r.balance > 0).length,
      sub: `${outstandingList.length} total students`,
      color: 'text-error',
      bg: 'bg-error-container',
    },
    {
      icon: 'campaign',
      label: 'Active Notices',
      value: noticesList.length,
      sub: noticesList.filter((n: any) => n.priority === 'high').length > 0
        ? `${noticesList.filter((n: any) => n.priority === 'high').length} high priority`
        : 'All clear',
      color: 'text-warning',
      bg: 'bg-warning-container',
    },
    {
      icon: 'calendar_month',
      label: 'Timetable Entries',
      value: timetableRes ?? 0,
      sub: `${classesData.length} classes`,
      color: 'text-success',
      bg: 'bg-success-container',
    },
    {
      icon: 'fact_check',
      label: 'Attendance Rate',
      value: attendanceData ? `${attendanceData.rate}%` : '--',
      sub: attendanceData ? `${attendanceData.present}/${attendanceData.total} present` : 'Loading...',
      color: 'text-info',
      bg: 'bg-info-container',
    },
    {
      icon: 'school',
      label: 'Total Classes',
      value: classesData.length,
      sub: `${outstandingList.length > 0 ? outstandingList.length : '--'} enrolled students`,
      color: 'text-secondary',
      bg: 'bg-secondary-container',
    },
  ], [outstandingList, noticesList, timetableRes, attendanceData, classesData]);

  return (
    <>
      <SEOHead title="ERP Dashboard" description="Consolidated school ERP management dashboard" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-1.5 border-b border-border/40 pb-6">
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Icon name="dashboard" className="text-primary" size={28} />
            ERP Dashboard
          </h1>
          <p className="text-body-md text-muted-foreground">Consolidated operational view of school fees, timetables, attendances, and notice boards</p>
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
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
            >
              {/* Main Content Area (Left 2 Columns) */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Key Metrics */}
                <section>
                  <h2 className="text-title-sm font-bold text-foreground mb-4 flex items-center gap-2 tracking-wide uppercase text-xs">
                    <Icon name="monitoring" className="text-primary" size={16} />
                    Key School Metrics
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statCards.map((s, i) => (
                      <motion.div key={s.label} variants={cardStackReveal} custom={i} className="group">
                        <Card className="border-border/50 bg-card hover:bg-accent/5 hover:border-primary/20 transition-all duration-300 shadow-sm relative overflow-hidden h-full">
                          {/* Accent Border Indicator based on color scheme */}
                          <div className={cn(
                            "absolute top-0 left-0 right-0 h-1",
                            s.color.includes('primary') ? 'bg-primary' :
                            s.color.includes('success') ? 'bg-emerald-500' :
                            s.color.includes('warning') ? 'bg-amber-500' :
                            s.color.includes('error') ? 'bg-red-500' :
                            s.color.includes('info') ? 'bg-sky-500' : 'bg-secondary'
                          )} />
                          <CardContent className="p-5 flex items-start justify-between gap-4 mt-1">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                              <p className="text-headline-sm font-bold tracking-tight text-foreground mt-2">{s.value}</p>
                              <p className="text-[11px] text-muted-foreground/75 mt-1 flex items-center gap-1 font-medium">
                                {s.sub}
                              </p>
                            </div>
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
                              s.bg
                            )}>
                              <Icon name={s.icon} size={20} className={s.color} />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Simplified Quick Links */}
                <section>
                  <h2 className="text-title-sm font-bold text-foreground mb-4 flex items-center gap-2 tracking-wide uppercase text-xs">
                    <Icon name="bolt" className="text-warning" size={16} />
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {QUICK_LINKS.map((link, idx) => (
                      <motion.div key={link.href} variants={cardStackReveal} custom={idx + statCards.length} className="group">
                        <Link to={link.href} className="block h-full">
                          <Card className="border-border/50 bg-card hover:bg-accent/5 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer h-full relative overflow-hidden">
                            <CardContent className="p-5 flex items-start gap-4">
                              <div className={cn(
                                "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shrink-0",
                                link.bg
                              )}>
                                <Icon name={link.icon} size={22} className={link.color} />
                              </div>
                              <div className="space-y-1.5 min-w-0">
                                <p className="text-label-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                  {link.label}
                                  <Icon name="arrow_forward" size={12} className="text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                                </p>
                                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                                  {link.desc}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </section>

              </div>

              {/* Sidebar Area (Right 1 Column) */}
              <div className="space-y-8">

                {/* Outstanding Fees Panel */}
                <section>
                  <h2 className="text-title-sm font-bold text-foreground mb-4 flex items-center gap-2 tracking-wide uppercase text-xs">
                    <Icon name="account_balance_wallet" className="text-error" size={16} />
                    Outstanding Dues
                  </h2>
                  <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
                    <CardContent className="p-4">
                      {outstandingList.filter((r: any) => r.balance > 0).length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-muted-foreground text-center">
                          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                            <Icon name="check_circle" className="text-emerald-500" size={20} />
                          </div>
                          <p className="text-label-sm font-bold text-foreground">No Outstanding Fees</p>
                          <p className="text-label-xs text-muted-foreground/80 mt-1">All accounts are fully paid.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
                            {outstandingList.filter((r: any) => r.balance > 0).slice(0, 5).map((item: any) => (
                              <div key={item.studentId} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/10 transition-colors">
                                <div className="min-w-0">
                                  <p className="text-label-sm font-bold text-foreground truncate">{item.studentName || item.studentId}</p>
                                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium">Due: Rs. {item.totalDue?.toLocaleString()}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <Badge variant="destructive" className="font-mono text-[10px] font-bold px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20">
                                    Rs. {item.balance?.toLocaleString()}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link to="/admin/fee" className="flex items-center justify-center gap-1">
                              <span>Full Fee Ledger</span>
                              <Icon name="arrow_forward" size={12} />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                {/* Active Notice Board Panel */}
                <section>
                  <h2 className="text-title-sm font-bold text-foreground mb-4 flex items-center gap-2 tracking-wide uppercase text-xs">
                    <Icon name="campaign" className="text-warning" size={16} />
                    Active Notices
                  </h2>
                  <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
                    <CardContent className="p-4">
                      {noticesList.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-muted-foreground text-center">
                          <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center mb-3">
                            <Icon name="campaign" className="text-warning" size={20} />
                          </div>
                          <p className="text-label-sm font-bold text-foreground">No active notices</p>
                          <p className="text-label-xs text-muted-foreground/80 mt-1">Check back later for school updates.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {noticesList.slice(0, 4).map((n: any) => (
                              <div key={n.id} className="relative pl-4 border-l border-border/60 pb-1 group">
                                <div className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background transition-transform duration-300 group-hover:scale-125" />
                                <div className="flex items-center gap-2">
                                  <p className="text-label-sm font-bold text-foreground truncate">{n.title}</p>
                                  {n.priority === 'high' && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-destructive/10 text-destructive uppercase tracking-wider h-3.5 border border-destructive/20">
                                      High
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground/85 line-clamp-2 mt-1 leading-relaxed">{n.content}</p>
                                <p className="text-[9px] text-muted-foreground/50 mt-1 font-mono font-medium">{new Date(n.created_at).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                            <Link to="/admin/noticeboard" className="flex items-center justify-center gap-1">
                              <span>All Announcements</span>
                              <Icon name="arrow_forward" size={12} />
                            </Link>
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
