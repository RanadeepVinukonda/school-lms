import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
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
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getAllSubjects } from '@/services/dataService';
import { getAllTextbooks } from '@/services/textbookService';
import { getSubjectDependencies } from '@/services/dependencyService';
import type { Subject } from '@/services/dataService';
import type { DependencyReport } from '@/services/dependencyService';

interface SubjectForm {
  name: string;
  code: string;
  icon: string;
  category: string;
}

const emptyForm: SubjectForm = { name: '', code: '', icon: 'menu_book', category: 'STEM' };

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
  STEM: 'bg-primary-container text-on-primary-container',
  Humanities: 'bg-warning-container text-on-warning-container',
  Arts: 'bg-error-container text-on-error-container',
  Languages: 'bg-success-container text-on-success-container',
  'Physical Education': 'bg-primary-container text-on-primary-container',
};

export default function AdminSubjectsPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
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

  // Sync fetched subjects into local state on initial load
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
    try {
      await addDoc(collection(db, 'subjects'), {
        name: form.name,
        code: form.code.toUpperCase(),
        icon: form.icon,
        color: '#6366f1',
        category: form.category,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setForm(emptyForm);
      setShowAdd(false);
      toast.success(`Subject ${form.name} added`);
      refetch();
    } catch {
      toast.error('Failed to add subject');
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
      <DataFetchWrapper
        data={subjects}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load subjects') : null}
        onRetry={() => refetch()}
        loadingType="card"
      >
        {() => (
          <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Subjects</h1>
                <p className="text-sm text-on-surface-variant">{subjects.length} total subjects</p>
              </div>
              <Button onClick={() => setShowAdd(true)}>
                <Icon name="add" size={18} className="mr-2" />
                Add Subject
              </Button>
            </motion.div>

            <motion.div variants={listItem}>
              <div className="relative max-w-sm">
                <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  placeholder="Search subjects..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <motion.div variants={listItem}>
                {subjects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="menu_book" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No subjects yet</p>
                      <p className="text-sm text-on-surface-variant">Add your first subject to get started.</p>
                      <Button onClick={() => setShowAdd(true)}>
                        <Icon name="add" size={18} className="mr-2" />
                        Add Subject
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No subjects match your search</p>
                      <p className="text-sm text-on-surface-variant">Try a different search term.</p>
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
                variants={listItem}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filtered.map((subject) => (
                  <Card key={subject.id} variant="elevated">
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
                            <p className="font-medium">{subject.name}</p>
                            <Badge variant="outline" className="text-[10px] mt-0.5">
                              {subject.code}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toast.success(`Edit ${subject.name}`)}
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDeleteClick(subject.id, subject.name)}
                          >
                            <Icon name="delete" size={16} className="text-error" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t-outline-variant border-t">
                        <Badge className={`text-[10px] ${categoryColors[subject.category || ''] || ''}`}>
                          {subject.category || '\u2014'}
                        </Badge>
                        <span className="text-xs text-on-surface-variant">
                          {getTextbookCount(subject.id)} textbook{getTextbookCount(subject.id) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
            </motion.div>
          </motion.div>
        )}
      </DataFetchWrapper>

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
            <div className="space-y-2 rounded-lg border border-outline-variant p-4">
              <p className="text-label-sm font-medium text-on-surface-variant uppercase tracking-wider">
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
              <span className="ml-auto text-xs text-on-surface-variant">Students retain access</span>
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
              <span className="ml-auto text-xs text-on-surface-variant">
                {(dependencyReport?.totalDependents ?? 0) > 0 ? 'Disabled — has dependencies' : 'Irreversible'}
              </span>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setShowDependencyDialog(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
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
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. CS"
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
