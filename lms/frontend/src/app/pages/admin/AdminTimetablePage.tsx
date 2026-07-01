import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { timetableService } from '@/services/timetableService';
import { getAllClasses } from '@/services/dataService';
import type { TimetableEntry } from '@/services/timetableService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};

const emptyForm = { day: 'Monday', period: 1, subjectId: '', teacherId: '', room: '', startTime: '', endTime: '' };

type FormData = typeof emptyForm;

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: TimetableEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label = entry.subject_id || entry.subjectId || '—';
  const teacher = entry.teacher_id || entry.teacherId || '';
  const room = entry.room || '';
  const start = entry.start_time || entry.startTime || '';
  const end = entry.end_time || entry.endTime || '';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative rounded-lg border border-border/60 bg-card p-2.5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-1">
        <Badge variant="info" className="text-[11px] leading-tight max-w-[100px] truncate">
          {label}
        </Badge>
        <div className="flex gap-0.5 shrink-0">
          <button
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted/40 transition-opacity text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            title="Edit"
          >
            <Icon name="edit" size={14} />
          </button>
          <button
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-error/10 transition-opacity text-muted-foreground hover:text-error"
            onClick={onDelete}
            title="Delete"
          >
            <Icon name="delete" size={14} />
          </button>
        </div>
      </div>
      {teacher && <p className="text-[11px] text-muted-foreground mt-1 truncate">{teacher}</p>}
      {room && <p className="text-[11px] text-muted-foreground truncate">Room {room}</p>}
      {(start || end) && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
          {start || '—'} – {end || '—'}
        </p>
      )}
    </motion.div>
  );
}

export default function AdminTimetablePage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const { data: classesData = [] } = useQuery({ queryKey: ['admin-classes'], queryFn: getAllClasses });

  const {
    data: entriesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['timetable', selectedClassId],
    queryFn: () => timetableService.getByClass(selectedClassId).then((r) => r.data),
    enabled: !!selectedClassId,
  });

  const entries = useMemo(() => (entriesData as TimetableEntry[] | undefined) || [], [entriesData]);

  const entriesMap = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    for (const e of entries) {
      const day = e.day || '';
      const period = e.period || 0;
      map.set(`${day}-${period}`, e);
    }
    return map;
  }, [entries]);

  const openAddDialog = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (entry: TimetableEntry) => {
    setEditId(entry.id);
    setForm({
      day: entry.day || 'Monday',
      period: entry.period || 1,
      subjectId: entry.subject_id || entry.subjectId || '',
      teacherId: entry.teacher_id || entry.teacherId || '',
      room: entry.room || '',
      startTime: entry.start_time || entry.startTime || '',
      endTime: entry.end_time || entry.endTime || '',
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      timetableService.create({ classId: selectedClassId, ...data }),
    onSuccess: () => {
      toast.success('Timetable entry added');
      setDialogOpen(false);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimetableEntry> }) =>
      timetableService.update(id, data),
    onSuccess: () => {
      toast.success('Timetable entry updated');
      setDialogOpen(false);
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timetableService.delete(id),
    onSuccess: () => {
      toast.success('Timetable entry deleted');
      refetch();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete entry'),
  });

  const handleDelete = (entry: TimetableEntry) => {
    if (!window.confirm('Delete this timetable entry?')) return;
    deleteMutation.mutate(entry.id);
  };

  const handleSubmit = () => {
    if (!form.day || !form.period) {
      toast.error('Day and Period are required');
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <SEOHead title="Timetable Management" description="Manage class timetables and scheduling" />
      <div className="sm:p-6 p-4 max-w-7xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Timetable Management</h1>
          <p className="text-body-md text-muted-foreground mt-1">Manage class-wise weekly timetables</p>
        </motion.div>

        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-title-sm">Select Class</CardTitle>
            {selectedClassId && (
              <Button size="sm" onClick={openAddDialog}>
                <Icon name="add" size={16} className="mr-1.5" />
                Add Entry
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <select
              className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-80"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">Select a class to view timetable</option>
              {classesData.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {selectedClassId && (
          <DataFetchWrapper
            data={entriesData}
            isLoading={isLoading}
            error={isError ? new Error('Failed to load timetable') : null}
            onRetry={refetch}
            loadingType="card"
          >
            {() => (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {entries.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="py-16 text-center">
                      <Icon name="calendar_month" size={48} className="text-muted-foreground/30 mx-auto" />
                      <p className="text-title-sm text-muted-foreground mt-4">No timetable entries for this class</p>
                      <p className="text-body-sm text-muted-foreground/60 mt-1">Add a timetable entry to get started</p>
                      <Button className="mt-6" onClick={openAddDialog}>
                        <Icon name="add" size={16} className="mr-1.5" />
                        Add First Entry
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="border border-border/60 rounded-xl overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-b-border/60 bg-muted/30">
                          <th className="px-3 py-3 text-label-sm font-bold text-muted-foreground uppercase tracking-wider w-16">
                            Period
                          </th>
                          {DAYS.map((day) => (
                            <th
                              key={day}
                              className="px-3 py-3 text-label-sm font-bold text-muted-foreground uppercase tracking-wider text-center"
                            >
                              {DAY_SHORT[day]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-title-sm">
                        {PERIODS.map((period) => (
                          <tr key={period} className="hover:bg-muted/10">
                            <td className="px-3 py-2.5 font-semibold text-muted-foreground text-center align-middle">
                              {period}
                            </td>
                            {DAYS.map((day) => {
                              const entry = entriesMap.get(`${day}-${period}`);
                              return (
                                <td key={day} className="px-2 py-2 align-top min-w-[140px]">
                                  {entry ? (
                                    <EntryCard
                                      entry={entry}
                                      onEdit={() => openEditDialog(entry)}
                                      onDelete={() => handleDelete(entry)}
                                    />
                                  ) : (
                                    <div className="h-full min-h-[72px] flex items-center justify-center">
                                      <span className="text-[11px] text-muted-foreground/20 select-none">—</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </DataFetchWrapper>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</DialogTitle>
              <DialogDescription>
                {editId ? 'Update the entry details below.' : 'Fill in the details for the new timetable entry.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-foreground">Day</label>
                <select
                  className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: e.target.value })}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-foreground">Period</label>
                <select
                  className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: Number(e.target.value) })}
                >
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-foreground">Subject ID</label>
                <Input
                  placeholder="e.g. subj_001"
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-foreground">Teacher ID</label>
                <Input
                  placeholder="e.g. teacher_001"
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-foreground">Room</label>
                <Input
                  placeholder="e.g. 201"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label-sm font-medium text-foreground">Start Time</label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-label-sm font-medium text-foreground">End Time</label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} loading={isPending} disabled={!form.day || !form.period}>
                <Icon name="check" size={16} className="mr-1.5" />
                {editId ? 'Update' : 'Add'} Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
