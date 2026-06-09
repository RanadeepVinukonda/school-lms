import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getTimetableByClass, getAllSubjects, getAllUsers, getAllClasses } from '@/services/dataService';
import { collection, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { TimetableEntry, Subject, UserDoc, ClassEntry } from '@/services/dataService';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

const dayLabels: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

interface SlotForm {
  day: string;
  period: number;
  subjectId: string;
  teacherId: string;
  room: string;
}

export default function AdminTimetablePage() {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEditor, setShowEditor] = useState(false);
  const [slotForm, setSlotForm] = useState<SlotForm>({ day: 'monday', period: 1, subjectId: '', teacherId: '', room: '' });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data: classList = [] } = useQuery({
    queryKey: ['admin-timetable-classes'],
    queryFn: getAllClasses,
  });

  const { data: timetableSlots = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-timetable', classId],
    queryFn: () => getTimetableByClass(classId!),
    enabled: !!classId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['admin-timetable-subjects'],
    queryFn: getAllSubjects,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-timetable-users'],
    queryFn: getAllUsers,
  });

  const teachers = useMemo(() => users.filter((u: UserDoc) => u.role === 'teacher'), [users]);

  const classData = useMemo(
    () => classList.find((c: ClassEntry) => c.id === classId) ?? null,
    [classList, classId]
  );

  const timetableMap = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    for (const slot of timetableSlots) {
      if (slot.day && slot.period != null) {
        map.set(`${slot.day}-${slot.period}`, slot);
      }
    }
    return map;
  }, [timetableSlots]);

  const openSlotEditor = useCallback((day: string, period: number, existing?: TimetableEntry) => {
    if (existing) {
      setSlotForm({
        day: existing.day || day,
        period: existing.period || period,
        subjectId: existing.subjectId || '',
        teacherId: existing.teacherId || '',
        room: existing.room || '',
      });
      setSelectedSlot(existing.id || null);
    } else {
      setSlotForm({
        day,
        period,
        subjectId: '',
        teacherId: '',
        room: '',
      });
      setSelectedSlot(null);
    }
    setShowEditor(true);
  }, []);

  const handleSaveSlot = async () => {
    if (!classId || !slotForm.subjectId || !slotForm.teacherId) {
      toast.error('Please select a subject and teacher');
      return;
    }
    try {
      if (selectedSlot) {
        const batch = writeBatch(db);
        const existing = timetableMap.get(`${slotForm.day}-${slotForm.period}`);
        if (existing && existing.id) {
          batch.delete(doc(db, 'timetable', existing.id));
        }
        batch.set(doc(collection(db, 'timetable')), {
          classId,
          day: slotForm.day,
          period: slotForm.period,
          subjectId: slotForm.subjectId,
          teacherId: slotForm.teacherId,
          room: slotForm.room,
          updatedAt: new Date().toISOString(),
        });
        await batch.commit();
      } else {
        const existing = timetableMap.get(`${slotForm.day}-${slotForm.period}`);
        if (existing && existing.id) {
          await deleteDoc(doc(db, 'timetable', existing.id));
        }
        await addDoc(collection(db, 'timetable'), {
          classId,
          day: slotForm.day,
          period: slotForm.period,
          subjectId: slotForm.subjectId,
          teacherId: slotForm.teacherId,
          room: slotForm.room,
          createdAt: new Date().toISOString(),
        });
      }
      setShowEditor(false);
      toast.success(`Slot ${slotForm.day} P${slotForm.period} saved`);
      refetch();
    } catch {
      toast.error('Failed to save timetable slot');
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    try {
      await deleteDoc(doc(db, 'timetable', slotId));
      toast.success('Slot removed');
      refetch();
    } catch {
      toast.error('Failed to remove slot');
    }
  };

  const subjectOptions = subjects.map((s: Subject) => ({ value: s.id, label: `${s.name} (${s.code})` }));
  const teacherOptions = teachers.map((t: UserDoc) => ({ value: t.id, label: t.displayName || t.email }));
  const dayOptions = days.map((d) => ({ value: d, label: dayLabels[d] }));
  const periodOptions = periods.map((p) => ({ value: String(p), label: `Period ${p}` }));

  const pageTitle = classData ? `${classData.name} Timetable` : 'Timetable';

  return (
    <>
      <SEOHead title={pageTitle} description={`Weekly timetable for ${classData?.name || 'class'}`} />
      <DataFetchWrapper
        data={(!isLoading && !isError) ? {} : undefined}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load timetable') : null}
        onRetry={() => refetch()}
        loadingType="card"
      >
        {() => {
          if (!classData) {
            return (
              <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
                <Card>
                  <CardContent className="flex flex-col items-center gap-4 py-16">
                    <Icon name="error" size={48} className="text-on-surface-variant/50" />
                    <p className="font-medium">Class not found</p>
                    <p className="text-sm text-on-surface-variant">The class you are looking for does not exist.</p>
                    <Button variant="outline" onClick={() => navigate('/admin/classes')}>
                      <Icon name="arrow_back" size={16} className="mr-2" />
                      Back to Classes
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          }

          const hasSlots = timetableSlots.length > 0;

          return (
            <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
              <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
                <motion.div variants={listItem} className="flex items-center gap-3 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin/classes')}>
                    <Icon name="arrow_back" size={18} className="mr-1" />
                    Back
                  </Button>
                  <div>
                    <h1 className="text-headline-sm">{classData.name} Timetable</h1>
                    <p className="text-sm text-on-surface-variant">
                      Code: {classData.code} &middot; Grade {classData.grade || '\u2014'} &middot;{' '}
                      {hasSlots ? `${timetableSlots.length} scheduled slots` : 'No schedule yet'}
                    </p>
                  </div>
                </motion.div>

                {!hasSlots ? (
                  <motion.div variants={listItem}>
                    <Card>
                      <CardContent className="flex flex-col items-center gap-4 py-16">
                        <Icon name="calendar_month" size={48} className="text-on-surface-variant/50" />
                        <p className="font-medium">No timetable set for this class</p>
                        <p className="text-sm text-on-surface-variant">Click Edit Schedule to add periods.</p>
                        <Button onClick={() => openSlotEditor('monday', 1)}>
                          <Icon name="edit" size={16} className="mr-2" />
                          Edit Schedule
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div variants={listItem} className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-px bg-outline-variant rounded-lg overflow-hidden">
                        <div className="bg-surface-variant/50 p-2 flex items-center justify-center">
                          <Icon name="schedule" size={16} className="text-on-surface-variant" />
                        </div>
                        {days.map((day) => (
                          <div key={day} className="bg-surface-variant/50 p-2 text-center text-label-sm font-semibold text-on-surface-variant uppercase">
                            {dayLabels[day]}
                          </div>
                        ))}
                        {periods.map((period) => (
                          <>
                            <div key={`label-${period}`} className="bg-surface-variant/30 p-2 flex items-center justify-center text-label-sm font-medium text-on-surface-variant">
                              P{period}
                            </div>
                            {days.map((day) => {
                              const slot = timetableMap.get(`${day}-${period}`);
                              const subject = slot ? subjects.find((s: Subject) => s.id === slot.subjectId) : undefined;
                              const teacher = slot ? users.find((u: UserDoc) => u.id === slot.teacherId) : undefined;
                              return (
                                <div
                                  key={`${day}-${period}`}
                                  className={
                                    'min-h-[72px] p-2 bg-surface relative group' +
                                    (slot ? ' hover:bg-surface-variant/30 transition-colors cursor-pointer' : ' hover:bg-surface-variant/10 transition-colors cursor-pointer')
                                  }
                                  onClick={() => openSlotEditor(day, period, slot || undefined)}
                                >
                                  {slot ? (
                                    <div className="h-full flex flex-col justify-center gap-0.5">
                                      <span className="text-label-sm font-medium leading-tight">{subject?.name || '\u2014'}</span>
                                      <span className="text-[10px] text-on-surface-variant leading-tight">{teacher?.displayName || '\u2014'}</span>
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 w-fit mt-0.5">Room {slot.room}</Badge>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-on-surface-variant/40 flex items-center justify-center h-full">
                                      Click to add
                                    </span>
                                  )}
                                  {slot && slot.id && (
                                    <button
                                      className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-error hover:text-error/80 transition-opacity"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveSlot(slot.id!); }}
                                      title="Remove slot"
                                    >
                                      <Icon name="close" size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button onClick={() => openSlotEditor('monday', 1)}>
                        <Icon name="edit" size={16} className="mr-2" />
                        Edit Schedule
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          );
        }}
      </DataFetchWrapper>

      <Dialog open={showEditor} onOpenChange={(open) => { if (!open) setShowEditor(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSlot ? 'Edit' : 'Add'} Timetable Slot</DialogTitle>
            <DialogDescription>
              {slotForm.day ? `${dayLabels[slotForm.day]}, Period ${slotForm.period}` : 'Select day and period'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Day</Label>
                <OptionsSelect
                  options={dayOptions}
                  placeholder="Select day"
                  value={slotForm.day}
                  onChange={(v: string) => setSlotForm((f) => ({ ...f, day: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <OptionsSelect
                  options={periodOptions}
                  placeholder="Select period"
                  value={String(slotForm.period)}
                  onChange={(v: string) => setSlotForm((f) => ({ ...f, period: parseInt(v, 10) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <OptionsSelect
                options={subjectOptions}
                placeholder="Select subject"
                value={slotForm.subjectId}
                onChange={(v: string) => setSlotForm((f) => ({ ...f, subjectId: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Teacher</Label>
              <OptionsSelect
                options={teacherOptions}
                placeholder="Select teacher"
                value={slotForm.teacherId}
                onChange={(v: string) => setSlotForm((f) => ({ ...f, teacherId: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <OptionsSelect
                options={[{ value: '101', label: 'Room 101' }, { value: '102', label: 'Room 102' }, { value: '103', label: 'Room 103' }, { value: '201', label: 'Room 201' }, { value: '202', label: 'Room 202' }, { value: '203', label: 'Room 203' }, { value: 'Lab A', label: 'Lab A' }, { value: 'Lab B', label: 'Lab B' }, { value: 'Auditorium', label: 'Auditorium' }]}
                placeholder="Select room"
                value={slotForm.room}
                onChange={(v: string) => setSlotForm((f) => ({ ...f, room: v }))}
              />
            </div>
            <Button className="w-full" onClick={handleSaveSlot}>
              <Icon name="save" size={16} className="mr-2" />
              {selectedSlot ? 'Update Slot' : 'Add Slot'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
