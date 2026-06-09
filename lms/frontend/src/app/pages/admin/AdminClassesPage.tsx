import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getAllClasses, getAllUsers } from '@/services/dataService';
import { getClassDependencies } from '@/services/dependencyService';
import { logAudit } from '@/services/auditService';
import type { ClassEntry, UserDoc } from '@/services/dataService';
import type { DependencyReport } from '@/services/dependencyService';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function AdminClassesPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [grade, setGrade] = useState('');
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);

  const { data: fetchedClasses, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: getAllClasses,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAllUsers,
  });

  useEffect(() => {
    if (fetchedClasses) {
      setClasses(fetchedClasses);
    }
  }, [fetchedClasses]);

  const filtered = useMemo(
    () =>
      classes.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
      }),
    [classes, search]
  );

  const handleCreate = async () => {
    const g = grade.trim();
    if (!g || !/^\d+$/.test(g)) {
      toast.error('Enter a valid grade number');
      return;
    }
    const num = parseInt(g, 10);
    const className = `${ordinal(num)} class`;
    try {
      await addDoc(collection(db, 'classes'), {
        name: className,
        code: `G${num}`,
        grade: g,
        section: '',
        academicYear: new Date().getFullYear().toString(),
        teacherIds: [],
        subjectIds: [],
        studentCount: 0,
        teacherCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setGrade('');
      setShowCreate(false);
      toast.success(`${className} created`);
      refetch();
    } catch {
      toast.error('Failed to create class');
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteLoading(true);
    setDependencyReport(null);
    setShowDependencyDialog(true);
    try {
      const report = await getClassDependencies(id);
      setDependencyReport(report);
    } catch {
      setDependencyReport(null);
    }
    setDeleteLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'classes', deleteTarget.id));
      setClasses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      logAudit({
        action: 'class.delete',
        targetId: deleteTarget.id,
        targetType: 'class',
        targetName: deleteTarget.name,
        summary: `Permanently deleted class "${deleteTarget.name}"`,
      });
      toast.success(`Class ${deleteTarget.name} permanently deleted`);
      setShowDependencyDialog(false);
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Failed to delete class');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <SEOHead title="Classes" description="Manage classes" canonical="/admin/classes" />
      <DataFetchWrapper
        data={classes}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load classes') : null}
        onRetry={() => refetch()}
        loadingType="card"
        emptyMessage="No classes yet"
        emptyAction={
          <Button onClick={() => setShowCreate(true)}>
            <Icon name="add" size={18} className="mr-2" />
            Create Class
          </Button>
        }
      >
        {() => (
          <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Classes</h1>
                <p className="text-sm text-on-surface-variant">{classes.length} total classes</p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Icon name="add" size={18} className="mr-2" />
                Create Class
              </Button>
            </motion.div>

            <motion.div variants={listItem}>
              <div className="relative max-w-sm">
                <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  placeholder="Search classes..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <motion.div variants={listItem}>
                {classes.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="class" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No classes yet</p>
                      <p className="text-sm text-on-surface-variant">Create your first class to get started.</p>
                      <Button onClick={() => setShowCreate(true)}>
                        <Icon name="add" size={18} className="mr-2" />
                        Create Class
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No classes match your search</p>
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
                {filtered.map((cls) => {
                  const classTeacher = users.find(
                    (u: UserDoc) => cls.teacherIds?.includes(u.id)
                  );
                  const subjectCount = cls.subjectIds?.length ?? 0;
                  return (
                    <Card key={cls.id} variant="elevated" className="hover:shadow-elevation-2 transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary-container flex items-center justify-center">
                              <Icon name="class" size={20} className="text-on-primary-container" />
                            </div>
                            <div>
                              <CardTitle className="text-title-md">{cls.name}</CardTitle>
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {cls.code}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-body-md">
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="school" size={16} />
                            <span>Grade {cls.grade || '\u2014'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="people" size={16} />
                            <span>{cls.studentCount ?? 0} students</span>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="badge" size={16} />
                            <span className="truncate">
                              {classTeacher ? classTeacher.displayName : 'No teacher'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="menu_book" size={16} />
                            <span>{subjectCount} subjects</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link to={`/admin/classes/${cls.id}/timetable`}>
                              <Icon name="calendar_today" size={14} className="mr-1.5" />
                              Timetable
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.success(`Edit ${cls.name}`)}
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(cls.id, cls.name)}
                          >
                            <Icon name="delete" size={16} className="text-error" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            )}
            </motion.div>
          </motion.div>
        )}
      </DataFetchWrapper>

      <Dialog open={showDependencyDialog} onOpenChange={(open) => { if (!open) { setShowDependencyDialog(false); setDeleteTarget(null); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name || 'Class'}</DialogTitle>
            <DialogDescription>
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <Icon name="sync" size={16} className="animate-spin" />
                  Analyzing dependencies...
                </span>
              ) : dependencyReport && dependencyReport.totalDependents > 0 ? (
                <span className="text-destructive font-medium">
                  {dependencyReport.totalDependents} dependenc{dependencyReport.totalDependents === 1 ? 'y' : 'ies'} found.
                  Deleting this class will affect linked records.
                </span>
              ) : dependencyReport ? (
                <span className="text-success font-medium">No dependencies found. Safe to delete.</span>
              ) : (
                'Unable to analyze dependencies.'
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

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="tonal"
              className="w-full justify-start"
              disabled={deleteLoading}
            >
              <Icon name="archive" size={16} className="mr-2" />
              Archive Class (coming soon)
              <span className="ml-auto text-xs text-on-surface-variant">Preserves all records</span>
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
                {(dependencyReport?.totalDependents ?? 0) > 0 ? 'Has dependencies' : 'Irreversible'}
              </span>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setShowDependencyDialog(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
            <DialogDescription>Enter the grade number. Name will be auto-generated (e.g. "1st class").</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                placeholder="e.g. 1, 2, 3..."
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                autoFocus
              />
              {grade && /^\d+$/.test(grade.trim()) && (
                <p className="text-sm text-muted-foreground">
                  Will be named: <span className="font-medium">{ordinal(parseInt(grade, 10))} class</span>
                </p>
              )}
            </div>
            <Button className="w-full" onClick={handleCreate}>
              <Icon name="add" size={16} className="mr-2" />
              Create Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
