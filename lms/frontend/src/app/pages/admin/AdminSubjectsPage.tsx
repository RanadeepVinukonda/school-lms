import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cardStackReveal } from '@/lib/motion';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getAllSubjects, getAllClasses } from '@/services/dataService';
import { getAllTextbooks } from '@/services/textbookService';
import { getSubjectDependencies } from '@/services/dependencyService';
import { logAudit } from '@/services/auditService';
import type { Subject } from '@/services/dataService';
import type { DependencyReport } from '@/services/dependencyService';

interface SubjectForm {
  name: string;
  code: string;
  icon: string;
  category: string;
  classId: string;
}

const emptyForm: SubjectForm = { name: '', code: '', icon: 'menu_book', category: 'STEM', classId: '' };

const categoryOptions = [
  { value: 'STEM', label: 'STEM' },
  { value: 'Humanities', label: 'Humanities' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Languages', label: 'Languages' },
  { value: 'Physical Education', label: 'Physical Education' },
];

const iconOptions = [
  { value: 'calculate', label: 'calculate' },
  { value: 'science', label: 'science' },
  { value: 'menu_book', label: 'menu_book' },
  { value: 'history', label: 'history' },
  { value: 'palette', label: 'palette' },
  { value: 'language', label: 'language' },
  { value: 'fitness_center', label: 'fitness_center' },
  { value: 'computer', label: 'computer' },
  { value: 'music_note', label: 'music_note' },
];

const categoryColors: Record<string, string> = {
  STEM: 'bg-primary/10 text-primary',
  Humanities: 'bg-warning/10 text-warning',
  Arts: 'bg-destructive/10 text-destructive',
  Languages: 'bg-success/10 text-success',
  'Physical Education': 'bg-primary/10 text-primary',
};

export default function AdminSubjectsPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);

  const { data: fetchedSubjects, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: getAllSubjects,
  });

  const { data: textbooks } = useQuery({
    queryKey: ['admin-textbooks'],
    queryFn: getAllTextbooks,
  });

  const { data: allClasses } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: getAllClasses,
  });

  useEffect(() => {
    if (fetchedSubjects) {
      setSubjects(fetchedSubjects);
    }
  }, [fetchedSubjects]);

  const filtered = useMemo(
    () =>
      subjects.filter((s) => {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      }),
    [subjects, search]
  );

  const handleAdd = async () => {
    if (!form.name || !form.code || !form.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!form.classId) {
      toast.error('Please select a class for this subject');
      return;
    }
    const code = form.code.toUpperCase();
    const duplicate = subjects.find((s) => s.code === code && (s as { classId?: string }).classId === form.classId && s.isActive !== false);
    if (duplicate) {
      toast.error(`Subject code "${code}" is already in use by "${duplicate.name}" for this class`);
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'subjects'), {
        name: form.name,
        code,
        icon: form.icon,
        color: '#6366f1',
        category: form.category,
        classId: form.classId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      logAudit({
        action: 'subject.create',
        targetId: docRef.id,
        targetType: 'subject',
        targetName: form.name,
        summary: `Created subject "${form.name}" (${code})`,
        newValue: { name: form.name, code, category: form.category, icon: form.icon },
      });
      setForm(emptyForm);
      setShowAdd(false);
      toast.success(`Subject ${form.name} added`);
      refetch();
    } catch {
      toast.error('Failed to add subject');
    }
  };

  const handleEditClick = (subject: Subject) => {
    setEditTarget(subject);
    setForm({ name: subject.name, code: subject.code, icon: subject.icon || 'menu_book', category: subject.category || 'STEM', classId: (subject as { classId?: string }).classId || '' });
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editTarget || !form.name || !form.code) {
      toast.error('Please fill in all required fields');
      return;
    }
    const code = form.code.toUpperCase();
    const duplicate = subjects.find((s) => s.code === code && s.id !== editTarget.id && (s as { classId?: string }).classId === form.classId && s.isActive !== false);
    if (duplicate) {
      toast.error(`Subject code "${code}" is already in use by "${duplicate.name}" for this class`);
      return;
    }
    const changedFields: string[] = [];
    if (form.name !== editTarget.name) changedFields.push('name');
    if (code !== editTarget.code) changedFields.push('code');
    if (form.category !== editTarget.category) changedFields.push('category');
    if (form.icon !== editTarget.icon) changedFields.push('icon');
    if (form.classId !== ((editTarget as { classId?: string }).classId || '')) changedFields.push('classId');

    const hasTextbooks = textbooks ? textbooks.filter((tb) => tb.subjectId === editTarget.id).length : 0;
    if (hasTextbooks > 0 && changedFields.length > 0) {
      const fieldList = changedFields.join(', ');
      toast.info(`${editTarget.name} is used by ${hasTextbooks} textbook${hasTextbooks !== 1 ? 's' : ''}. Changing ${fieldList} will update references across the system.`);
    }
    try {
      await updateDoc(doc(db, 'subjects', editTarget.id), {
        name: form.name,
        code,
        icon: form.icon,
        category: form.category,
        classId: form.classId,
        updatedAt: new Date().toISOString(),
      });
      logAudit({
        action: 'subject.update',
        targetId: editTarget.id,
        targetType: 'subject',
        targetName: editTarget.name,
        summary: `Updated subject "${editTarget.name}" (changed: ${changedFields.join(', ') || 'none'})`,
        oldValue: { name: editTarget.name, code: editTarget.code, category: editTarget.category },
        newValue: { name: form.name, code, category: form.category, classId: form.classId },
      });
      setForm(emptyForm);
      setShowEdit(false);
      setEditTarget(null);
      toast.success(`Subject ${form.name} updated`);
      refetch();
    } catch {
      toast.error('Failed to update subject');
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteLoading(true);
    setDependencyReport(null);
    setShowDependencyDialog(true);
    try {
      const report = await getSubjectDependencies(id);
      setDependencyReport(report);
    } catch {
      setDependencyReport(null);
    }
    setDeleteLoading(false);
  };

  const handleArchiveSubject = async () => {
    if (!deleteTarget) return;
    try {
      await updateDoc(doc(db, 'subjects', deleteTarget.id), { isActive: false });
      logAudit({
        action: 'subject.archive',
        targetId: deleteTarget.id,
        targetType: 'subject',
        targetName: deleteTarget.name,
        summary: `Archived subject "${deleteTarget.name}"`,
        newValue: { isActive: false },
      });
      toast.success(`Subject ${deleteTarget.name} archived`);
      setShowDependencyDialog(false);
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Failed to archive subject');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'subjects', deleteTarget.id));
      logAudit({
        action: 'subject.delete',
        targetId: deleteTarget.id,
        targetType: 'subject',
        targetName: deleteTarget.name,
        summary: `Permanently deleted subject "${deleteTarget.name}"`,
      });
      toast.success(`Subject ${deleteTarget.name} permanently deleted`);
      setShowDependencyDialog(false);
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Failed to delete subject');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getTextbookCount = (subjectId: string) =>
    textbooks ? textbooks.filter((tb) => tb.subjectId === subjectId).length : 0;

  return (
    <>
      <SEOHead title="Subjects" description="Manage academic subjects" canonical="/admin/subjects" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32"
      >
        <DataFetchWrapper
          data={subjects}
          isLoading={isLoading}
          error={isError ? new Error('Failed to load subjects') : null}
          onRetry={() => refetch()}
          loadingType="card"
        >
          {() => (
            <motion.div variants={cardStackReveal} custom={0} className="space-y-16">
              <motion.div variants={cardStackReveal} custom={1}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h1 className="text-headline-sm font-bold">Subjects</h1>
                    <p className="text-body-md text-muted-foreground">{subjects.length} total subjects</p>
                  </div>
                  <Button onClick={() => setShowAdd(true)}>
                    <Icon name="add" size={18} className="mr-2" />
                    Add Subject
                  </Button>
                </div>
              </motion.div>

              <motion.div variants={cardStackReveal} custom={2}>
                <div className="relative max-w-sm">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search subjects..."
                    className="pl-10 border-border/60 placeholder:text-muted-foreground"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </motion.div>

              {filtered.length === 0 ? (
                <motion.div variants={cardStackReveal} custom={3}>
                  {subjects.length === 0 ? (
                    <Card className="border-border/60">
                      <CardContent className="flex flex-col items-center gap-4 py-16">
                        <Icon name="menu_book" size={48} className="text-muted-foreground/50" />
                        <p className="text-title-sm font-medium">No subjects yet</p>
                        <p className="text-body-md text-muted-foreground">Add your first subject to get started.</p>
                        <Button onClick={() => setShowAdd(true)}>
                          <Icon name="add" size={18} className="mr-2" />
                          Add Subject
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-border/60">
                      <CardContent className="flex flex-col items-center gap-4 py-16">
                        <Icon name="search_off" size={48} className="text-muted-foreground/50" />
                        <p className="text-title-sm font-medium">No subjects match your search</p>
                        <p className="text-body-md text-muted-foreground">Try a different search term.</p>
                        <Button variant="outline" onClick={() => setSearch('')}>
                          <Icon name="close" size={16} className="mr-2" />
                          Clear Search
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  variants={cardStackReveal}
                  custom={3}
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {filtered.map((subject) => (
                    <Card key={subject.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-11 w-11 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
                            >
                              <Icon
                                name={subject.icon || 'menu_book'}
                                size={22}
                              />
                            </div>
                            <div>
                              <p className="text-body-md font-medium">{subject.name}</p>
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {subject.code}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditClick(subject)}
                            >
                              <Icon name="edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteClick(subject.id, subject.name)}
                            >
                              <Icon name="delete" size={16} className="text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                          <div className="flex items-center gap-2">
                            {(subject as { classId?: string }).classId && allClasses && (
                              <span className="text-label-sm text-muted-foreground font-medium">
                                {allClasses.find((c) => c.id === (subject as { classId?: string }).classId)?.name || '\u2014'}
                              </span>
                            )}
                            <Badge className={`text-[10px] ${categoryColors[subject.category || ''] || ''}`}>
                              {subject.category || '\u2014'}
                            </Badge>
                          </div>
                          <span className="text-label-sm text-muted-foreground">
                            {getTextbookCount(subject.id)} textbook{getTextbookCount(subject.id) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>

      <Dialog open={showDependencyDialog} onOpenChange={(open) => { if (!open) { setShowDependencyDialog(false); setDeleteTarget(null); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name || 'Subject'}</DialogTitle>
            <DialogDescription>
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <Icon name="sync" size={16} className="animate-spin" />
                  Analyzing dependencies...
                </span>
              ) : dependencyReport && dependencyReport.totalDependents > 0 ? (
                <span className="text-destructive font-medium">
                  This subject has {dependencyReport.totalDependents} dependent entit{dependencyReport.totalDependents === 1 ? 'y' : 'ies'}.
                  Deleting will orphan academic records.
                </span>
              ) : dependencyReport ? (
                <span className="text-success font-medium">No dependencies found. Safe to delete.</span>
              ) : (
                'Unable to analyze dependencies. Proceed with caution.'
              )}
            </DialogDescription>
          </DialogHeader>

          {dependencyReport && dependencyReport.categories.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border/60 p-4">
              <p className="text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                Impact Summary
              </p>
              {dependencyReport.categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between text-body-md">
                  <span>{cat.label}</span>
                  <Badge variant="outline">{cat.count}</Badge>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="tonal"
              className="w-full justify-start"
              onClick={handleArchiveSubject}
              disabled={deleteLoading}
            >
              <Icon name="archive" size={16} className="mr-2" />
              Archive Subject (recommended)
              <span className="ml-auto text-xs text-muted-foreground">Students retain access</span>
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={handleConfirmDelete}
              disabled={deleteLoading || (dependencyReport?.totalDependents ?? 0) > 0}
              loading={deleteLoading}
            >
              <Icon name="delete_forever" size={16} className="mr-2" />
              Permanently Delete
              <span className="ml-auto text-xs text-muted-foreground">
                {(dependencyReport?.totalDependents ?? 0) > 0 ? 'Disabled \u2014 has dependencies' : 'Irreversible'}
              </span>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setShowDependencyDialog(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(false); setEditTarget(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              {editTarget && `Updating "${editTarget.name}". Changes will be reflected across the system.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input
                placeholder="e.g. Computer Science"
                className="border-border/60 placeholder:text-muted-foreground"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. CS"
                  className="border-border/60 placeholder:text-muted-foreground"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <OptionsSelect
                  options={iconOptions}
                  placeholder="Select icon"
                  value={form.icon}
                  onChange={(v: string) => setForm((f) => ({ ...f, icon: v }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <OptionsSelect
                options={categoryOptions}
                placeholder="Select category"
                value={form.category}
                onChange={(v: string) => setForm((f) => ({ ...f, category: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <OptionsSelect
                options={allClasses?.map((c) => ({ value: c.id, label: c.name })) || []}
                placeholder="Select class"
                value={form.classId}
                onChange={(v: string) => setForm((f) => ({ ...f, classId: v }))}
              />
            </div>
            {editTarget && (
              <p className="text-label-sm text-muted-foreground">
                <Icon name="info" size={14} className="inline mr-1" />
                Updating {editTarget.name} affects subjects across textbooks, exams, assignments, and grades.
              </p>
            )}
            <Button className="w-full" onClick={handleUpdate}>
              <Icon name="save" size={16} className="mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Create a new academic subject.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input
                placeholder="e.g. Computer Science"
                className="border-border/60 placeholder:text-muted-foreground"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. CS"
                  className="border-border/60 placeholder:text-muted-foreground"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <OptionsSelect
                  options={iconOptions}
                  placeholder="Select icon"
                  value={form.icon}
                  onChange={(v: string) => setForm((f) => ({ ...f, icon: v }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <OptionsSelect
                options={categoryOptions}
                placeholder="Select category"
                value={form.category}
                onChange={(v: string) => setForm((f) => ({ ...f, category: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <OptionsSelect
                options={allClasses?.map((c) => ({ value: c.id, label: c.name })) || []}
                placeholder="Select class"
                value={form.classId}
                onChange={(v: string) => setForm((f) => ({ ...f, classId: v }))}
              />
            </div>
            <Button className="w-full" onClick={handleAdd}>
              <Icon name="add" size={16} className="mr-2" />
              Add Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
