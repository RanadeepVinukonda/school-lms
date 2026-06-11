import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { pageTransition } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

function ScheduleForm({ onSave, loading }: { onSave: (data: any) => void; loading: boolean }) {
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(60);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['test-templates-all'],
    queryFn: () => api.get('/test-templates').then((r) => r.data.data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !title.trim() || !startDate || !endDate) { toast.error('Please fill all required fields'); return; }
    onSave({ templateId, title, startDate, endDate: endDate, durationMinutes: duration, requiresApproval });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Template</label>
        <select value={templateId} onChange={(e) => {
          setTemplateId(e.target.value);
          const t = (templates || []).find((tm: any) => tm.id === e.target.value);
          if (t) setTitle(t.title);
        }} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
          <option value="">Select a template...</option>
          {(templates || []).map((t: any) => <option key={t.id} value={t.id}>{t.title} ({t.status})</option>)}
        </select>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title" />
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-sm font-medium">Start Date/Time</label><Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><label className="text-sm font-medium">End Date/Time</label><Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      </div>
      <div><label className="text-sm font-medium">Duration (minutes)</label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} /></div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
        Requires approval before publishing
      </label>
      <Button type="submit" disabled={loading}>Schedule Test</Button>
    </form>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TeacherTestSchedulePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-schedules', user?.id],
    queryFn: () => api.get('/test-schedule', { params: { createdBy: user?.id } }).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/test-schedule', body),
    onSuccess: () => { toast.success('Test scheduled'); setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['test-schedules'] }); },
    onError: () => toast.error('Failed to schedule test'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/test-schedule/${id}/approve`),
    onSuccess: () => { toast.success('Schedule approved'); queryClient.invalidateQueries({ queryKey: ['test-schedules'] }); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.put(`/test-schedule/${id}/status`, { status: 'cancelled' }),
    onSuccess: () => { toast.success('Schedule cancelled'); queryClient.invalidateQueries({ queryKey: ['test-schedules'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/test-schedule/${id}`),
    onSuccess: () => { toast.success('Schedule deleted'); queryClient.invalidateQueries({ queryKey: ['test-schedules'] }); },
  });

  return (
    <>
      <SEOHead title="Test Schedule" description="Schedule and manage tests" canonical="/teacher/test-schedule" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">Test Schedule</h1>
            <p className="text-sm text-muted-foreground">Schedule, approve, and manage tests</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Icon name="add" size={16} className="mr-1" />Schedule Test</Button>
        </div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
          {(schedules: any[]) => (
            <div className="space-y-2">
              {schedules.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground"><Icon name="calendar_month" size={48} className="mx-auto mb-3 opacity-40" /><p>No scheduled tests.</p></CardContent></Card>
              ) : (
                schedules.map((s: any) => (
                  <Card key={s.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{s.title}</h3>
                            <Badge variant="outline" className={`text-xs ${STATUS_STYLES[s.status] || ''}`}>{s.status?.replace('_', ' ')}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span><Icon name="schedule" size={12} className="inline mr-0.5" />{s.durationMinutes} min</span>
                            <span><Icon name="play_arrow" size={12} className="inline mr-0.5" />{s.startDate ? new Date(s.startDate).toLocaleString() : '-'}</span>
                            <span><Icon name="stop" size={12} className="inline mr-0.5" />{s.endDate ? new Date(s.endDate).toLocaleString() : '-'}</span>
                            <span>{s.totalStudents || 0} students</span>
                            <span>{s.attemptedCount || 0} attempts</span>
                          </div>
                          {s.approvedBy && <p className="text-xs text-muted-foreground mt-1">Approved by: {s.approvedBy}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {s.status === 'pending_approval' && <Button size="sm" onClick={() => approveMutation.mutate(s.id)}><Icon name="check" size={14} className="mr-1" />Approve</Button>}
                          {(s.status === 'scheduled' || s.status === 'approved') && <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(s.id)}>Cancel</Button>}
                          {(s.status === 'draft' || s.status === 'cancelled') && <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(s.id); }}><Icon name="delete" size={16} /></Button>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DataFetchWrapper>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule a Test</DialogTitle>
              <DialogDescription>Select a template and set the schedule.</DialogDescription>
            </DialogHeader>
            <ScheduleForm onSave={(formData) => createMutation.mutate(formData)} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
