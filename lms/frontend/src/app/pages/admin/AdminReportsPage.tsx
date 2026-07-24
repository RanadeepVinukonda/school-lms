import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import api from '@/services/api';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  urgent: 'bg-rose-100 text-rose-700',
};

const CATEGORY_ICONS: Record<string, string> = {
  suggestion: 'lightbulb',
  complaint: 'report',
  feedback: 'feedback',
  improvement: 'trending_up',
  technical_issue: 'bug_report',
};

function formatDate(d: string) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

export default function AdminReportsPage() {
  const { _ } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-reports', activeTab],
    queryFn: () => {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      params.set('limit', '100');
      return api.get(`/report-feedback?${params}`).then((r) => r.data.data);
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: () => api.get('/users?role=teacher').then((r) => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-report-stats'],
    queryFn: () => api.get('/report-feedback/stats').then((r) => r.data.data),
  });

  const { data: classes } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => api.get('/classes').then((r) => r.data.data),
  });

  const classList = Array.isArray(classes) ? classes : classes?.items || [];

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/report-feedback/${selectedReport?.id}`, {
      ...(newStatus && { status: newStatus }),
      ...(assignTo && { assignedTo: assignTo }),
      ...(selectedReport?.assignedTeacherName !== assignTo && assignTo && {
        assignedTeacherName: teachers?.find((t: any) => t.id === assignTo)?.display_name || assignTo,
      }),
      ...(remarks && { remarks }),
    }),
    onSuccess: () => {
      toast.success(_('Report updated'));
      setDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report-stats'] });
      setSelectedReport(null);
      setRemarks('');
      setAssignTo('');
      setNewStatus('');
    },
    onError: () => toast.error(_('Failed to update report')),
  });

  const filteredItems = useMemo(() => {
    let items = data?.items || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r: any) =>
        r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.userName?.toLowerCase().includes(q)
      );
    }
    if (filterRole) items = items.filter((r: any) => r.userRole === filterRole);
    if (filterCategory) items = items.filter((r: any) => r.category === filterCategory);
    if (filterClass) items = items.filter((r: any) => r.classId === filterClass || r.className === filterClass);
    if (filterStatus) items = items.filter((r: any) => r.status === filterStatus);
    return items;
  }, [data?.items, searchQuery, filterRole, filterCategory, filterClass, filterStatus]);

  return (
    <>
      <SEOHead title={_('Reports & Suggestions')} description={_('Manage user reports and suggestions')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 max-w-7xl mx-auto space-y-6 pb-32">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-headline-md font-bold">{_('Reports & Suggestions')}</h1>
            <p className="text-body-md text-muted-foreground mt-1">{_('Manage user feedback, suggestions, and issues')}</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-border/60"><CardContent className="p-4 text-center">
              <p className="text-headline-sm font-bold text-foreground">{stats.total || 0}</p>
              <p className="text-label-xs text-muted-foreground">{_('Total')}</p>
            </CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4 text-center">
              <p className="text-headline-sm font-bold text-yellow-600">{stats.byStatus?.open || 0}</p>
              <p className="text-label-xs text-muted-foreground">{_('Open')}</p>
            </CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4 text-center">
              <p className="text-headline-sm font-bold text-blue-600">{stats.byStatus?.in_progress || 0}</p>
              <p className="text-label-xs text-muted-foreground">{_('In Progress')}</p>
            </CardContent></Card>
            <Card className="border-border/60"><CardContent className="p-4 text-center">
              <p className="text-headline-sm font-bold text-green-600">{stats.byStatus?.resolved || 0}</p>
              <p className="text-label-xs text-muted-foreground">{_('Resolved')}</p>
            </CardContent></Card>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={_('Search reports...')} className="pl-10" />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">{_('All Roles')}</option>
            <option value="student">{_('Student')}</option>
            <option value="teacher">{_('Teacher')}</option>
            <option value="parent">{_('Parent')}</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">{_('All Categories')}</option>
            <option value="suggestion">{_('Suggestion')}</option>
            <option value="complaint">{_('Complaint')}</option>
            <option value="feedback">{_('Feedback')}</option>
            <option value="improvement">{_('Improvement')}</option>
            <option value="technical_issue">{_('Technical Issue')}</option>
          </select>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">{_('All Classes')}</option>
            {classList.map((cls: any) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">{_('All Statuses')}</option>
            <option value="open">{_('Open')}</option>
            <option value="in_progress">{_('In Progress')}</option>
            <option value="resolved">{_('Resolved')}</option>
            <option value="closed">{_('Closed')}</option>
          </select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">{_('All')}</TabsTrigger>
            <TabsTrigger value="open">{_('Open')}</TabsTrigger>
            <TabsTrigger value="in_progress">{_('In Progress')}</TabsTrigger>
            <TabsTrigger value="resolved">{_('Resolved')}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <DataFetchWrapper
              data={filteredItems}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
              loadingType="list"
              emptyMessage={_('No reports found')}
              emptyIcon={<Icon name="inbox" size={40} className="text-muted-foreground/50" />}
            >
              {() => (
                <div className="space-y-3">
                  {filteredItems.map((report: any) => (
                    <Card key={report.id} className="border-border/60 hover:border-primary/20 transition-colors cursor-pointer"
                      onClick={() => { setSelectedReport(report); setRemarks(report.remarks || ''); setDetailOpen(true); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${STATUS_COLORS[report.status]?.split(' ')[0] || 'bg-gray-100'}`}>
                            <Icon name={CATEGORY_ICONS[report.category] || 'feedback'} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="font-semibold truncate">{report.title}</p>
                              <Badge variant="secondary" className={`text-[10px] shrink-0 capitalize ${PRIORITY_COLORS[report.priority] || ''}`}>{_(report.priority)}</Badge>
                              <Badge variant="secondary" className={`text-[10px] shrink-0 capitalize ${STATUS_COLORS[report.status] || ''}`}>{_(report.status?.replace(/_/g, ' '))}</Badge>
                            </div>
                            <p className="text-label-xs text-muted-foreground line-clamp-2">{report.description}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Icon name="person" size={14} />{report.userName}</span>
                              <span className="capitalize flex items-center gap-1"><Icon name="badge" size={14} />{_(report.userRole)}</span>
                              {report.className && <span className="flex items-center gap-1"><Icon name="school" size={14} />{report.className}</span>}
                              <span className="flex items-center gap-1"><Icon name="calendar_today" size={14} />{formatDate(report.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </DataFetchWrapper>
          </TabsContent>
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedReport?.title || _('Report Details')}</DialogTitle>
              <DialogDescription>
                {selectedReport && (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-label-sm">
                      <Icon name="person" size={16} /><span>{selectedReport.userName}</span>
                      <span className="capitalize">({_(selectedReport.userRole)})</span>
                      {selectedReport.className && <><Icon name="school" size={16} /><span>{selectedReport.className}</span></>}
                    </div>
                    <div className="flex items-center gap-2 text-label-sm">
                      <Badge variant="secondary" className={`text-[10px] capitalize ${PRIORITY_COLORS[selectedReport.priority] || ''}`}>{_(selectedReport.priority)}</Badge>
                      <Badge variant="secondary" className={`text-[10px] capitalize ${STATUS_COLORS[selectedReport.status] || ''}`}>{_(selectedReport.status?.replace(/_/g, ' '))}</Badge>
                      <Icon name="calendar_today" size={14} /><span>{formatDate(selectedReport.createdAt)}</span>
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">{_('Description')}</p>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">{selectedReport?.description}</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">{_('Status')}</label>
                <select
                  value={newStatus || selectedReport?.status || 'open'}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="open">{_('Open')}</option>
                  <option value="in_progress">{_('In Progress')}</option>
                  <option value="resolved">{_('Resolved')}</option>
                  <option value="closed">{_('Closed')}</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">{_('Assign to Teacher')}</label>
                <select
                  value={assignTo || selectedReport?.assignedTo || ''}
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">{_('Unassigned')}</option>
                  {(teachers?.items || teachers || []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.display_name || t.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">{_('Remarks / Resolution Notes')}</label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={_('Add remarks or resolution notes...')}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>{_('Cancel')}</Button>
              <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>{_('Update')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
