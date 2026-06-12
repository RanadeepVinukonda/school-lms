import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getAllClasses, getAllUsers, getAllSubjects } from '@/services/dataService';
import { getClassDependencies } from '@/services/dependencyService';
import { logAudit } from '@/services/auditService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import type { ClassEntry, UserDoc, Subject } from '@/services/dataService';
import type { DependencyReport } from '@/services/dependencyService';

interface TeacherClassSubject {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function AdminClassesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [grade, setGrade] = useState('');
  const [code, setCode] = useState('');
  const [section, setSection] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassEntry | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '', grade: '', section: '', roomNumber: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Teacher Assignment states
  const [showAssign, setShowAssign] = useState(false);
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const handleAssignClick = (classId: string, subjectId: string) => {
    setAssignClassId(classId);
    setAssignSubjectId(subjectId);
    setSelectedTeacherId('');
    setShowAssign(true);
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId) {
      toast.error('Please select a teacher');
      return;
    }
    setAssignLoading(true);
    try {
      await teacherClassSubjectService.assign({
        teacherId: selectedTeacherId,
        classId: assignClassId,
        subjectId: assignSubjectId,
      });
      toast.success('Teacher assigned successfully');
      setShowAssign(false);
      queryClient.invalidateQueries({ queryKey: ['admin-tc-assignments'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign teacher');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveTeacherAssignment = async (classId: string, subjectId: string) => {
    const assignment = tcAssignments.find((a) => a.classId === classId && a.subjectId === subjectId);
    if (!assignment) return;
    try {
      await teacherClassSubjectService.remove(assignment.id);
      toast.success('Teacher assignment removed');
      queryClient.invalidateQueries({ queryKey: ['admin-tc-assignments'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove assignment');
    }
  };

  const { data: fetchedClasses, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: getAllClasses,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAllUsers,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: getAllSubjects,
  });

  const { data: tcAssignments = [] } = useQuery({
    queryKey: ['admin-tc-assignments'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'teacherClassSubject'));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherClassSubject));
    },
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

  const handleGradeChange = (val: string) => {
    setGrade(val);
    if (/^\d+$/.test(val.trim())) {
      setCode(`G${val.trim()}`);
    } else {
      setCode('');
    }
  };

  const handleCreate = async () => {
    const g = grade.trim();
    if (!g || !/^\d+$/.test(g)) {
      toast.error('Enter a valid grade number');
      return;
    }
    const num = parseInt(g, 10);
    const className = `${ordinal(num)} class`;
    const finalCode = code.trim().toUpperCase() || `G${num}`;

    const duplicate = classes.find((c) => c.code === finalCode);
    if (duplicate) {
      toast.error(`Class code "${finalCode}" is already in use by "${duplicate.name}"`);
      return;
    }

    try {
      const classRef = await addDoc(collection(db, 'classes'), {
        name: className,
        code: finalCode,
        grade: g,
        section: section.trim() || '',
        roomNumber: roomNumber.trim() || '',
        academicYear: new Date().getFullYear().toString(),
        teacherIds: [],
        subjectIds: [],
        studentCount: 0,
        teacherCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      logAudit({
        action: 'class.create',
        targetId: classRef.id,
        targetType: 'class',
        targetName: className,
        summary: `Created class "${className}" (${finalCode})`,
        newValue: { name: className, code: finalCode, grade: g, section: section.trim(), roomNumber: roomNumber.trim() },
      });
      setGrade('');
      setCode('');
      setSection('');
      setRoomNumber('');
      setShowCreate(false);
      toast.success(`${className} created`);
      refetch();
    } catch {
      toast.error('Failed to create class');
    }
  };

  const handleEditClick = (cls: ClassEntry) => {
    setEditTarget(cls);
    setEditForm({
      name: cls.name,
      code: cls.code,
      grade: cls.grade || '',
      section: cls.section || '',
      roomNumber: cls.roomNumber || '',
    });
    setShowEdit(true);
  };

  const handleUpdateClass = async () => {
    if (!editTarget || !editForm.name || !editForm.code) {
      toast.error('Please fill in all required fields');
      return;
    }
    const duplicate = classes.find((c) => c.code === editForm.code.toUpperCase() && c.id !== editTarget.id);
    if (duplicate) {
      toast.error(`Class code "${editForm.code.toUpperCase()}" is already in use by "${duplicate.name}"`);
      return;
    }
    try {
      await updateDoc(doc(db, 'classes', editTarget.id), {
        name: editForm.name,
        code: editForm.code.toUpperCase(),
        grade: editForm.grade || null,
        section: editForm.section || null,
        roomNumber: editForm.roomNumber || null,
        updatedAt: new Date().toISOString(),
      });
      logAudit({
        action: 'class.update',
        targetId: editTarget.id,
        targetType: 'class',
        targetName: editTarget.name,
        summary: `Updated class "${editTarget.name}"`,
        oldValue: { name: editTarget.name, code: editTarget.code, grade: editTarget.grade, section: editTarget.section },
        newValue: { name: editForm.name, code: editForm.code.toUpperCase(), grade: editForm.grade, section: editForm.section },
      });
      setShowEdit(false);
      setEditTarget(null);
      toast.success(`Class ${editForm.name} updated`);
      refetch();
    } catch {
      toast.error('Failed to update class');
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

  const handleArchiveClass = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await updateDoc(doc(db, 'classes', deleteTarget.id), { isActive: false, updatedAt: new Date().toISOString() });
      logAudit({
        action: 'class.archive',
        targetId: deleteTarget.id,
        targetType: 'class',
        targetName: deleteTarget.name,
        summary: `Archived class "${deleteTarget.name}"`,
        newValue: { isActive: false },
      });
      toast.success(`Class ${deleteTarget.name} archived`);
      setShowDependencyDialog(false);
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Failed to archive class');
    } finally {
      setDeleteLoading(false);
    }
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

  const getClassSubjects = (classId: string) =>
    subjects.filter((s) => s.classId === classId);

  const getSubjectTeacher = (classId: string, subjectId: string): UserDoc | undefined => {
    const assignment = tcAssignments.find((a) => a.classId === classId && a.subjectId === subjectId);
    if (!assignment) return undefined;
    return users.find((u) => u.id === assignment.teacherId);
  };

  const getClassStudents = (classId: string) =>
    users.filter((u) => u.role === 'student' && u.classId === classId);

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
                    const isExpanded = expandedId === cls.id;
                    const classSubjects = getClassSubjects(cls.id);
                    const classStudents = getClassStudents(cls.id);

                    return (
                      <Card key={cls.id} variant="elevated" className="hover:shadow-elevation-2 transition-shadow">
                        <div
                          className="cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : cls.id)}
                        >
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
                              <Icon
                                name={isExpanded ? 'expand_less' : 'expand_more'}
                                size={20}
                                className="text-on-surface-variant"
                              />
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
                          </CardContent>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-outline-variant px-4 pb-4 pt-3 space-y-4">
                            <div>
                              <h4 className="text-label-sm font-medium text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Icon name="menu_book" size={14} />
                                Subjects
                              </h4>
                              {classSubjects.length === 0 ? (
                                <p className="text-sm text-on-surface-variant/60 ml-6">No subjects assigned</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {classSubjects.map((subject) => {
                                    const teacher = getSubjectTeacher(cls.id, subject.id);
                                    return (
                                      <li key={subject.id} className="flex items-center justify-between text-sm py-1 px-3 rounded-lg bg-surface-variant/40">
                                        <span className="font-medium">{subject.name}</span>
                                        <div className="flex items-center gap-2">
                                          {teacher ? (
                                            <div className="flex items-center gap-1 bg-surface/60 px-2 py-0.5 rounded border border-outline-variant/30">
                                              <span className="text-on-surface-variant text-xs flex items-center gap-1 font-medium">
                                                <Icon name="person" size={12} className="text-primary" />
                                                {teacher.displayName}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 w-5 p-0 text-error hover:bg-error/15 rounded-full"
                                                title="Remove Teacher Assignment"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRemoveTeacherAssignment(cls.id, subject.id);
                                                }}
                                              >
                                                <Icon name="close" size={12} />
                                              </Button>
                                            </div>
                                          ) : (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-6 text-[10px] py-0 px-2 flex items-center gap-0.5 font-semibold text-primary border-primary/30 hover:bg-primary/5"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAssignClick(cls.id, subject.id);
                                              }}
                                            >
                                              <Icon name="person_add" size={10} />
                                              Assign
                                            </Button>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            <div>
                              <h4 className="text-label-sm font-medium text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Icon name="people" size={14} />
                                Students ({classStudents.length})
                              </h4>
                              {classStudents.length === 0 ? (
                                <p className="text-sm text-on-surface-variant/60 ml-6">No students enrolled</p>
                              ) : (
                                <ul className="space-y-1 max-h-48 overflow-y-auto">
                                  {classStudents.map((student) => (
                                    <li key={student.id} className="flex items-center justify-between text-sm py-1 px-3 rounded-lg bg-surface-variant/40">
                                      <span className="font-medium">{student.displayName}</span>
                                      {student.studentId && (
                                        <Badge variant="outline" className="text-[10px]">
                                          {student.studentId}
                                        </Badge>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}

                        <div className={cn('px-4 pb-4 flex items-center gap-2', isExpanded && 'pt-1')}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/classes/${cls.id}/timetable`)}
                            title="Timetable"
                          >
                            <Icon name="calendar_month" size={16} className="text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(cls)}
                            title="Edit"
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(cls.id, cls.name)}
                            title="Delete"
                          >
                            <Icon name="delete" size={16} className="text-error" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </DataFetchWrapper>

      <Dialog open={showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(false); setEditTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              {editTarget && `Updating "${editTarget.name}". Changes affect student enrollments and timetable.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input
                  placeholder="e.g. 1st class"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. 1-A"
                  value={editForm.code}
                  onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input
                  placeholder="e.g. 1"
                  value={editForm.grade}
                  onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g. A"
                  value={editForm.section}
                  onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Room</Label>
                <Input
                  placeholder="e.g. 101"
                  value={editForm.roomNumber}
                  onChange={(e) => setEditForm((f) => ({ ...f, roomNumber: e.target.value }))}
                />
              </div>
            </div>
            {editTarget && (
              <p className="text-xs text-on-surface-variant flex items-center gap-1">
                <Icon name="info" size={14} />
                Editing this class affects timetables and student enrollments.
              </p>
            )}
            <Button className="w-full" onClick={handleUpdateClass}>
              <Icon name="save" size={16} className="mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              onClick={handleArchiveClass}
              disabled={deleteLoading}
              loading={deleteLoading}
            >
              <Icon name="archive" size={16} className="mr-2" />
              Archive Class
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

      <Dialog open={showCreate} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setGrade('');
          setCode('');
          setSection('');
          setRoomNumber('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
            <DialogDescription>Fill in class details. Class name will be auto-generated based on the grade number.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                placeholder="e.g. 1, 2, 3..."
                value={grade}
                onChange={(e) => handleGradeChange(e.target.value)}
                autoFocus
              />
              {grade && /^\d+$/.test(grade.trim()) && (
                <p className="text-sm text-muted-foreground">
                  Will be named: <span className="font-medium">{ordinal(parseInt(grade, 10))} class</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Class Code</Label>
              <Input
                placeholder="e.g. G1-A"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g. A, B"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  placeholder="e.g. 101"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate}>
              <Icon name="add" size={16} className="mr-2" />
              Create Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ASSIGN TEACHER DIALOG */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
            <DialogDescription>
              Assign a teacher to the selected subject in this class. Each class subject can only have one active teacher assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Teacher</Label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                <option value="">-- Choose a teacher --</option>
                {users.filter((u: UserDoc) => u.role === 'teacher').map((t: UserDoc) => (
                  <option key={t.id} value={t.id}>
                    {t.displayName} ({t.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button
              onClick={handleAssignTeacher}
              disabled={!selectedTeacherId || assignLoading}
            >
              {assignLoading ? (
                <><Icon name="sync" size={16} className="mr-2 animate-spin" />Assigning...</>
              ) : (
                <><Icon name="check" size={16} className="mr-2" />Assign Teacher</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
