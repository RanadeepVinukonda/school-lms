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
import { cardStackReveal } from '@/lib/motion';
import api from '@/services/api';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export default function AdminAcademicYearsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get('/academic-years').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/academic-years', { name, code, startDate, endDate, isCurrent }),
    onSuccess: () => { toast.success('Academic year created'); closeDialog(); queryClient.invalidateQueries({ queryKey: ['academic-years'] }); },
    onError: (err: any) => toast.error(err.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/academic-years/${editing.id}`, { name, code, startDate, endDate, isCurrent }),
    onSuccess: () => { toast.success('Academic year updated'); closeDialog(); queryClient.invalidateQueries({ queryKey: ['academic-years'] }); },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academic-years/${id}`),
    onSuccess: () => { toast.success('Academic year deleted'); queryClient.invalidateQueries({ queryKey: ['academic-years'] }); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const handleSave = () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Name and Code are required');
      return;
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  function closeDialog() { setShowCreate(false); setEditing(null); setName(''); setCode(''); setStartDate(''); setEndDate(''); setIsCurrent(false); }

  function openEdit(item: any) {
    setEditing(item); setName(item.name); setCode(item.code);
    setStartDate(item.startDate?.split('T')[0] || ''); setEndDate(item.endDate?.split('T')[0] || '');
    setIsCurrent(item.isCurrent || false); setShowCreate(true);
  }

  const items: any[] = data?.items ?? data ?? [];

  return (
    <>
      <SEOHead title="Academic Years" description="Manage academic years" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0} className="space-y-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-headline-sm">Academic Years</h1>
              <p className="text-body-md text-muted-foreground">Create and manage academic years</p>
            </div>
            <Button onClick={() => { setEditing(null); setShowCreate(true); }}><Icon name="add" size={16} className="mr-1" />Add Year</Button>
          </div>

          <DataFetchWrapper data={items} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list" emptyMessage="No academic years yet">
            {() => (
              <div className="space-y-3">
                {items.length === 0 ? (
                  <Card className="border-border/60"><CardContent className="p-8 text-center text-muted-foreground"><Icon name="calendar_month" size={48} className="mx-auto mb-3 opacity-40" /><p>No academic years</p></CardContent></Card>
                ) : (
                  items.map((y: any) => (
                    <Card key={y.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-title-sm font-semibold">{y.name}</h3>
                              <Badge variant={y.status === 'active' ? 'default' : y.status === 'archived' ? 'secondary' : 'outline'} className="text-xs">{y.status}</Badge>
                              {y.isCurrent && <Badge variant="success" className="text-xs">Current</Badge>}
                            </div>
                            <p className="text-label-sm text-muted-foreground">Code: {y.code}</p>
                            <div className="flex items-center gap-3 mt-1 text-label-xs text-muted-foreground">
                              <span>Start: {y.startDate ? new Date(y.startDate).toLocaleDateString() : '-'}</span>
                              <span>End: {y.endDate ? new Date(y.endDate).toLocaleDateString() : '-'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(y)}><Icon name="edit" size={16} /></Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm(y)}><Icon name="delete" size={16} /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </DataFetchWrapper>

          <Dialog open={showCreate} onOpenChange={(o) => { if (!o) closeDialog(); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit' : 'Create'} Academic Year</DialogTitle>
                <DialogDescription>Set up a new academic year period.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2025-2026" />
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 2025-26" />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Start Date</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div><label className="text-sm font-medium">End Date</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} />
                  Set as current academic year
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSave} disabled={!name.trim() || !code.trim() || createMutation.isPending || updateMutation.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={!!deleteConfirm}
            onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}
            title="Delete Academic Year"
            description={deleteConfirm ? `Are you sure you want to delete the academic year "${deleteConfirm.name}"? This action is permanent and cannot be undone.` : ''}
            confirmText="Delete"
            destructive
            onConfirm={() => {
              if (deleteConfirm) {
                deleteMutation.mutate(deleteConfirm.id);
                setDeleteConfirm(null);
              }
            }}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
