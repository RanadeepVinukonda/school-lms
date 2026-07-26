import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/supabase/config';
import { useAuthStore } from '@/store/authStore';
import { logAudit } from '@/services/auditService';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import type { Class, UserRole } from '@/types';

interface SubjectWithClassId {
  id: string;
  name: string;
  code: string;
  classId: string;
  category?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

interface TCSAssignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

export default function ClassSelectionPage() {
  const { _ } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  // Subject selection state
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, string>>({});
  const [subjectsMap, setSubjectsMap] = useState<Record<string, SubjectWithClassId[]>>({});
  const [takenSubjectIds, setTakenSubjectIds] = useState<Set<string>>(new Set());
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // If teacher already has classIds (assigned by admin), skip to dashboard
  useEffect(() => {
    if (user && user.classIds && user.classIds.length > 0) {
      const first = user.classIds[0];
      localStorage.setItem('lms-selected-class', first);
      navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
    }
  }, [user]);

  // Fetch existing teacher-class-subject assignments to know which subjects are taken
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await api.get<TCSAssignment[]>('/teacher-class-subject/all');
        const taken = new Set<string>();
        for (const a of res.data) {
          if (a.teacherId !== user?.id) {
            taken.add(a.subjectId);
          }
        }
        setTakenSubjectIds(taken);
      } catch {
        // Endpoint may not be available yet — proceed without it
      }
    }
    if (user) fetchAssignments();
  }, [user]);

  useEffect(() => {
    async function fetch() {
      try {
        const { data: items } = await supabase.from('classes').select('*');
        setClasses((items || []) as Class[]);
      } catch {
        setError(_('Failed to load classes'));
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  // Fetch subjects when selected classes change
  useEffect(() => {
    async function fetchSubjects() {
      if (selectedIds.size === 0) {
        setSubjectsMap({});
        return;
      }
      setLoadingSubjects(true);
      try {
        const newMap: Record<string, SubjectWithClassId[]> = {};
        for (const classId of selectedIds) {
          const { data: subs } = await supabase.from('subjects').select('*').eq('classId', classId);
          newMap[classId] = (subs || []) as SubjectWithClassId[];
        }
        setSubjectsMap(newMap);
      } catch {
        setError(_('Failed to load subjects'));
      } finally {
        setLoadingSubjects(false);
      }
    }
    fetchSubjects();
  }, [selectedIds]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSubjectSelect(classId: string, subjectId: string) {
    setSelectedSubjects((prev) => ({ ...prev, [classId]: subjectId }));
  }

  async function handleSubmit() {
    if (!user || saving || selectedIds.size === 0) return;
    setSaving(true);
    setError('');

    try {
      const classIdArray = Array.from(selectedIds);
      const subjectAssignments = classIdArray
        .filter((cid) => selectedSubjects[cid])
        .map((cid) => ({
          classId: cid,
          subjectId: selectedSubjects[cid],
        }));

      await api.post('/teacher-class-subject/setup', {
        classIds: classIdArray,
        subjectAssignments,
      });

      const { data: d } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      if (d) {
        setUser({
          id: d.id,
          email: d.email || '',
          displayName: d.display_name || '',
          role: (d.role as UserRole) || 'teacher',
          isActive: d.is_active ?? true,
          classIds: d.class_ids as string[] | undefined,
          avatar: d.photo_url || undefined,
          firstName: d.display_name?.split(' ')[0] || undefined,
          lastName: d.display_name?.split(' ').slice(1).join(' ') || undefined,
          phone: d.phone_number || undefined,
          dateOfBirth: undefined,
          bio: undefined,
          address: undefined,
          studentId: d.student_id || undefined,
          teacherId: undefined,
          classId: d.class_id || undefined,
          tutorialSeen: undefined,
          createdAt: d.created_at || '',
          updatedAt: d.updated_at || '',
        });
      }

      const selectedNames = classes
        .filter((c) => selectedIds.has(c.id))
        .map((c) => `${c.name}${c.section ? ` - ${c.section}` : ''}`)
        .join(', ');

      logAudit({
        action: 'teacher.class.assignment',
        targetId: user.id,
        targetType: 'user',
        targetName: user?.displayName ?? 'Unknown',
        summary: `${_('Teacher')} "${user?.displayName ?? 'Unknown'}" ${_('assigned to classes:')} ${selectedNames}`,
        newValue: { classIds: classIdArray, subjectAssignments },
      });

      await supabase.from('notifications').insert({
        userId: user.id,
        type: 'welcome',
        title: _('Welcome to Genesis LMS!'),
        body: `${_('Hi')} ${user?.displayName ?? 'Unknown'}! ${_("You're now assigned to")} ${selectedNames}. ${_('Start creating content for your students.')}`,
        data: { role: 'teacher', classIds: classIdArray },
        priority: 'high',
        read: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      });

      navigate(ROUTES.TEACHER_DASHBOARD, { replace: true });
    } catch {
      setError(_('Failed to save selection. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{_('Loading classes\u2026')}</p>
      </div>
    );
  }

  const activeClasses = classes.filter((c) => c.isActive);
  const totalSubjectsSelected = Object.keys(selectedSubjects).length;

  // Derived button state
  const hasClassesWithSubjects = Array.from(selectedIds).some(
    (cid) => subjectsMap[cid] && subjectsMap[cid].length > 0,
  );
  const missingSubjectSelection =
    hasClassesWithSubjects &&
    Array.from(selectedIds).some(
      (cid) => subjectsMap[cid] && subjectsMap[cid].length > 0 && !selectedSubjects[cid],
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="sm:p-6 p-4 max-w-2xl mx-auto pb-32"
    >
      <div className="space-y-16">
        <motion.div variants={cardStackReveal} custom={0}>
          <div className="text-center space-y-2">
            <img src="/genesis_icon.png" alt={_('Genesis')} className="mx-auto h-16 w-auto" />
            <h1 className="text-2xl font-bold">{_('Welcome,')} {user?.displayName}</h1>
            <p className="text-muted-foreground">{_('Select the classes you teach and your subjects')}</p>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={cardStackReveal} custom={0}>
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive text-center">
              {error}
            </div>
          </motion.div>
        )}

        {/* Step 1: Class selection */}
        <motion.div variants={cardStackReveal} custom={0}>
          <div>
            <h2 className="text-lg font-semibold mb-3">{_('Choose your classes')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeClasses.map((cls) => {
                const checked = selectedIds.has(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggle(cls.id)}
                    disabled={saving}
                    className={`rounded-xl border p-4 text-left transition-colors disabled:opacity-50 ${
                      checked
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-card hover:border-primary hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(cls.id)} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold">{cls.name}{cls.section ? ` - ${cls.section}` : ''}</h3>
                        <p className="text-sm text-muted-foreground">
                          {_('Grade')} {cls.grade}{cls.code ? ` · ${cls.code}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {cls.studentCount ?? 0} {_('students')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeClasses.length === 0 && (
              <p className="text-center text-muted-foreground">
                {_('No classes available yet. Ask an admin to create one.')}
              </p>
            )}
          </div>
        </motion.div>

        {/* Step 2: Subject selection per selected class */}
        {selectedIds.size > 0 && (
          <motion.div variants={cardStackReveal} custom={0} className="space-y-6">
            <hr className="border-border" />
            <div>
              <h2 className="text-lg font-semibold">{_('Choose your subject per class')}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {_('Pick one subject you teach in each selected class')}
              </p>
            </div>

            {Array.from(selectedIds).map((classId) => {
              const cls = classes.find((c) => c.id === classId);
              const subjects = subjectsMap[classId];
              const selectedSubject = selectedSubjects[classId];

              return (
                <div key={classId} className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-semibold text-base mb-3">{cls?.name || classId}</h3>

                  {loadingSubjects && !subjects ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  ) : !subjects || subjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      {_('No subjects created for this class yet')}
                    </p>
                  ) : (
                    <RadioGroup
                      value={selectedSubject || ''}
                      onValueChange={(value) => handleSubjectSelect(classId, value)}
                    >
                      <div className="grid gap-2">
                        {subjects.map((subject) => {
                          const isTaken = takenSubjectIds.has(subject.id);
                          const isSelected = selectedSubject === subject.id;
                          return (
                            <label
                              key={subject.id}
                              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                isTaken
                                  ? 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                                  : isSelected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-border hover:border-primary hover:bg-accent'
                              }`}
                            >
                              <RadioGroupItem
                                value={subject.id}
                                disabled={isTaken}
                                checked={isSelected}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{subject.name}</span>
                                  {isTaken && (
                                    <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                                      {_('Already assigned')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {subject.code}
                                  {subject.category ? ` · ${subject.category}` : ''}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </RadioGroup>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Submit */}
        <motion.div variants={cardStackReveal} custom={0}>
          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={saving || selectedIds.size === 0 || missingSubjectSelection}
              loading={saving}
            >
              {selectedIds.size === 0
                ? _('Select at least one class')
                : missingSubjectSelection
                  ? _('Choose a subject for each class')
                  : `${_('Continue with')} ${selectedIds.size} ${selectedIds.size !== 1 ? _('classes') : _('class')} ${_('and')} ${totalSubjectsSelected} ${totalSubjectsSelected !== 1 ? _('subjects') : _('subject')}`}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
