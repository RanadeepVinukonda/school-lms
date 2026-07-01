import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { noticeService } from '@/services/noticeService';
import { getAllClasses } from '@/services/dataService';
import type { CreateNoticeData } from '@/services/noticeService';

const priorityBadge = (p: string) => {
  switch (p) {
    case 'high': return <Badge variant="destructive">High</Badge>;
    case 'medium': return <Badge variant="warning">Medium</Badge>;
    case 'low': return <Badge variant="info">Low</Badge>;
    default: return <Badge variant="secondary">{p}</Badge>;
  }
};

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function AdminNoticeBoardPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateNoticeData>({ title: '', content: '', priority: 'medium', expires_at: '', target_class_id: null });

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: getAllClasses,
  });

  const { data: noticesRes, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: () => noticeService.getNotices(),
  });

  const notices = (noticesRes as any)?.data as any[] | undefined;

  const createMutation = useMutation({
    mutationFn: (data: CreateNoticeData) => noticeService.createNotice(data),
    onSuccess: () => {
      toast.success('Notice created');
      setForm({ title: '', content: '', priority: 'medium', expires_at: '', target_class_id: null });
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create notice'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => noticeService.deleteNotice(id),
    onSuccess: () => {
      toast.success('Notice deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete notice'),
  });

  const canSubmit = form.title.trim() && form.content.trim();

  return (
    <>
      <SEOHead title="Notice Board" description="Create and manage school notices" />
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Notice Board</h1>
          <p className="text-body-md text-muted-foreground mt-1">Post and manage announcements for students, teachers, and parents</p>
        </motion.div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-title-sm">Create New Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Notice title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="sm:col-span-2"
              />
              <Textarea
                placeholder="Write the notice content..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="sm:col-span-2 min-h-[100px]"
              />
              <div>
                <label className="text-label-sm text-muted-foreground mb-1 block">Priority</label>
                <OptionsSelect
                  options={priorityOptions}
                  value={form.priority}
                  onValueChange={(v: string) => setForm({ ...form, priority: v })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-label-sm text-muted-foreground mb-1 block">Target Class</label>
                <select
                  value={form.target_class_id ?? ''}
                  onChange={(e) => setForm({ ...form, target_class_id: e.target.value || null })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All Classes</option>
                  {(classes as any[])?.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-label-sm text-muted-foreground mb-1 block">Expires At</label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="mt-4"
              onClick={() => createMutation.mutate(form)}
              loading={createMutation.isPending}
              disabled={!canSubmit}
            >
              <Icon name="add" size={16} className="mr-1.5" />
              Post Notice
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-title-sm font-semibold text-foreground">All Notices</h2>
          <DataFetchWrapper
            data={notices}
            isLoading={isLoading}
            error={error ? new Error('Failed to load notices') : null}
            onRetry={refetch}
            loadingType="card"
            emptyMessage="No notices posted yet"
            emptyAction={
              <Button size="sm" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Notice title"]')?.focus()}>
                Create the first notice
              </Button>
            }
          >
            {() => (
              <div className="space-y-3">
                {(notices as any[])?.map((n: any) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-border/60 hover:border-border transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-title-sm font-semibold truncate">{n.title}</h3>
                              {priorityBadge(n.priority)}
                              {n.target_class_id ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {(classes as any[])?.find((c: any) => c.id === n.target_class_id)?.name || 'Specific Class'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">All Classes</Badge>
                              )}
                            </div>
                            <p className="text-body-md text-foreground line-clamp-2 whitespace-pre-wrap">{n.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-label-xs text-muted-foreground">
                              <span>{new Date(n.created_at).toLocaleDateString()}</span>
                              {n.expires_at && (
                                <span>
                                  Expires {new Date(n.expires_at).toLocaleDateString()}
                                </span>
                              )}
                              {n.created_by_name && <span>by {n.created_by_role ? `${n.created_by_role} - ` : ''}{n.created_by_name}</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-error"
                            onClick={() => {
                              if (window.confirm('Delete this notice?')) {
                                deleteMutation.mutate(n.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            title="Delete notice"
                          >
                            <Icon name="delete" size={20} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </DataFetchWrapper>
        </div>
      </div>
    </>
  );
}
