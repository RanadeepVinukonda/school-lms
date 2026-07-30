import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';

import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OptionsSelect } from '@/components/ui/select';
import { cardStackReveal } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/supabase/config';
import { hasRole } from '@/lib/roleHelpers';
import { getAllClasses, getAllUsers, getAllSubjects } from '@/services/dataService';
import api from '@/services/api';
import { getClassDependencies, getUserDependencies } from '@/services/dependencyService';
import { logAudit } from '@/services/auditService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { userService } from '@/services/userService';
import type { ClassEntry, UserDoc, Subject } from '@/services/dataService';
import type { DependencyReport } from '@/services/dependencyService';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const subjectCategoryOptions = [
  { value: 'STEM', label: 'STEM' },
  { value: 'Humanities', label: 'Humanities' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Languages', label: 'Languages' },
  { value: 'Physical Education', label: 'Physical Education' },
];

const subjectIconOptions = [
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

export default function AdminClassesPage() {
  const { activeYear } = useActiveAcademicYear();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('classes');

  // Queries
  const { data: fetchedClasses = [], isLoading: classesLoading, isError: classesError, refetch: refetchClasses } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: getAllClasses,
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAllUsers,
  });

  const { data: subjects = [], refetch: refetchSubjects } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: getAllSubjects,
  });

  const { data: tcAssignments = [], refetch: refetchTCAssignments } = useQuery({
    queryKey: ['admin-tc-assignments'],
    queryFn: () => teacherClassSubjectService.getAll().then((res) => res.data),
  });

  const handleRefreshAll = () => {
    refetchClasses();
    refetchUsers();
    refetchSubjects();
    refetchTCAssignments();
  };

  // Shared Credential Dialog State
  const [createdCredentials, setCreatedCredentials] = useState<{
    displayName: string;
    email: string;
    generatedPassword?: string;
    studentId?: string;
  } | null>(null);

  // -------------------------------------------------------------
  // TAB 1: CLASSES
  // -------------------------------------------------------------
  const [classSearch, setClassSearch] = useState('');
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [classGrade, setClassGrade] = useState('');
  const [classCode, setClassCode] = useState('');
  const [classSection, setClassSection] = useState('');
  const [classRoomNumber, setClassRoomNumber] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [classCreateLoading, setClassCreateLoading] = useState(false);

  const [classDeleteTarget, setClassDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [classDeleteLoading, setClassDeleteLoading] = useState(false);
  const [classDependencyReport, setClassDependencyReport] = useState<DependencyReport | null>(null);
  const [showClassDependencyDialog, setShowClassDependencyDialog] = useState(false);

  const [showEditClass, setShowEditClass] = useState(false);
  const [editClassTarget, setEditClassTarget] = useState<ClassEntry | null>(null);
  const [editClassForm, setEditClassForm] = useState({ name: '', code: '', grade: '', section: '', roomNumber: '' });

  // Class Search Filtering
  const filteredClasses = useMemo(() => {
    return fetchedClasses.filter((c) => {
      const q = classSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [fetchedClasses, classSearch]);

  const handleClassGradeChange = (val: string) => {
    setClassGrade(val);
    if (/^\d+$/.test(val.trim())) {
      setClassCode(`G${val.trim()}${classSection.trim().toUpperCase()}`);
    } else {
      setClassCode('');
    }
  };

  const handleCreateClass = async () => {
    if (classCreateLoading) return;
    const g = classGrade.trim();
    if (!g || !/^\d+$/.test(g)) {
      toast.error('Enter a valid grade number');
      return;
    }
    const num = parseInt(g, 10);
    const className = `${ordinal(num)} class`;
    const finalCode = classCode.trim().toUpperCase() || `G${num}${classSection.trim().toUpperCase()}`;

    const duplicate = fetchedClasses.find((c) => c.code === finalCode);
    if (duplicate) {
      toast.error(`Class code "${finalCode}" is already in use by "${duplicate.name}"`);
      return;
    }

    setClassCreateLoading(true);
    try {
      await api.post('/classes', {
        name: className,
        code: finalCode,
        grade: g,
        section: classSection.trim() || '',
        roomNumber: classRoomNumber.trim() || '',
        academicYear: activeYear,
        status: 'active',
      });
      setClassGrade('');
      setClassCode('');
      setClassSection('');
      setClassRoomNumber('');
      setShowCreateClass(false);
      toast.success(`${className} created`);
      refetchClasses();
    } catch {
      toast.error('Failed to create class');
    } finally {
      setClassCreateLoading(false);
    }
  };

  const handleEditClassClick = (cls: ClassEntry) => {
    setEditClassTarget(cls);
    setEditClassForm({
      name: cls.name,
      code: cls.code,
      grade: cls.grade || '',
      section: cls.section || '',
      roomNumber: cls.roomNumber || '',
    });
    setShowEditClass(true);
  };

  const handleUpdateClass = async () => {
    if (!editClassTarget || !editClassForm.name || !editClassForm.code) {
      toast.error('Please fill in all required fields');
      return;
    }
    const duplicate = fetchedClasses.find((c) => c.code === editClassForm.code.toUpperCase() && c.id !== editClassTarget.id);
    if (duplicate) {
      toast.error(`Class code "${editClassForm.code.toUpperCase()}" is already in use by "${duplicate.name}"`);
      return;
    }
    try {
      const { error } = await supabase.from('classes').update({
        name: editClassForm.name,
        code: editClassForm.code.toUpperCase(),
        grade: editClassForm.grade || null,
        section: editClassForm.section || null,
        room_number: editClassForm.roomNumber || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editClassTarget.id);
      if (error) throw error;

      logAudit({
        action: 'class.update',
        targetId: editClassTarget.id,
        targetType: 'class',
        targetName: editClassTarget.name,
        summary: `Updated class "${editClassTarget.name}"`,
        oldValue: { name: editClassTarget.name, code: editClassTarget.code, grade: editClassTarget.grade, section: editClassTarget.section },
        newValue: { name: editClassForm.name, code: editClassForm.code.toUpperCase(), grade: editClassForm.grade, section: editClassForm.section },
      });
      setShowEditClass(false);
      setEditClassTarget(null);
      toast.success(`Class ${editClassForm.name} updated`);
      refetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update class');
    }
  };

  const handleDeleteClassClick = async (id: string, name: string) => {
    setClassDeleteTarget({ id, name });
    setClassDeleteLoading(true);
    setClassDependencyReport(null);
    setShowClassDependencyDialog(true);
    try {
      const report = await getClassDependencies(id);
      setClassDependencyReport(report);
    } catch {
      setClassDependencyReport(null);
    }
    setClassDeleteLoading(false);
  };

  const handleArchiveClass = async () => {
    if (!classDeleteTarget) return;
    setClassDeleteLoading(true);
    try {
      const { error } = await supabase.from('classes').update({ status: 'inactive', updated_at: new Date().toISOString() }).eq('id', classDeleteTarget.id);
      if (error) throw error;

      logAudit({
        action: 'class.archive',
        targetId: classDeleteTarget.id,
        targetType: 'class',
        targetName: classDeleteTarget.name,
        summary: `Archived class "${classDeleteTarget.name}"`,
        newValue: { isActive: false },
      });
      toast.success(`Class ${classDeleteTarget.name} archived`);
      setShowClassDependencyDialog(false);
      setClassDeleteTarget(null);
      refetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive class');
    } finally {
      setClassDeleteLoading(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!classDeleteTarget) return;
    setClassDeleteLoading(true);
    try {
      const classId = classDeleteTarget.id;

      // 1. Get all student IDs associated with this class (both via current class_id and enrollments)
      const [studentsRes, enrollmentsRes] = await Promise.all([
        supabase.from('users').select('id').eq('class_id', classId).eq('role', 'student'),
        supabase.from('student_class_enrollments').select('student_id').eq('class_id', classId),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;

      const studentIds = new Set<string>();
      (studentsRes.data || []).forEach((s: any) => studentIds.add(s.id));
      (enrollmentsRes.data || []).forEach((e: any) => studentIds.add(e.student_id));

      const studentIdsArray = Array.from(studentIds);

      // 2. Delete student users from 'users' table (cascades to fee_payments, enrollments, etc.)
      if (studentIdsArray.length > 0) {
        const { error: delUserErr } = await supabase.from('users').delete().in('id', studentIdsArray);
        if (delUserErr) throw delUserErr;
      }

      // Also clean up any residual students set to this class_id
      const { error: delResidErr } = await supabase.from('users').delete().eq('class_id', classId).eq('role', 'student');
      if (delResidErr) throw delResidErr;

      // 3. Find and delete textbooks for this class (and related lessons, quizzes, assignments)
      const { data: textbooks, error: getTbErr } = await supabase.from('textbooks').select('id').eq('class_id', classId);
      if (getTbErr) throw getTbErr;
      const textbookIds = (textbooks || []).map((t: any) => t.id);

      if (textbookIds.length > 0) {
        const delRes = await Promise.all([
          supabase.from('lessons').delete().in('textbook_id', textbookIds),
          supabase.from('quizzes').delete().in('textbook_id', textbookIds),
          supabase.from('assignments').delete().in('textbook_id', textbookIds),
        ]);
        for (const r of delRes) {
          if (r.error) throw r.error;
        }
      }
      const { error: delTbErr } = await supabase.from('textbooks').delete().eq('class_id', classId);
      if (delTbErr) throw delTbErr;

      // 4. Delete class relations, timetable, subjects, and enrollments
      const delRels = await Promise.all([
        supabase.from('student_class_enrollments').delete().eq('class_id', classId),
        supabase.from('class_teachers').delete().eq('class_id', classId),
        supabase.from('class_subjects').delete().eq('class_id', classId),
        supabase.from('teacher_class_subject_assignments').delete().eq('class_id', classId),
        supabase.from('timetable').delete().eq('class_id', classId),
        supabase.from('subjects').delete().eq('class_id', classId),
      ]);
      for (const r of delRels) {
        if (r.error) throw r.error;
      }

      // 5. Finally delete the class record
      const { error: delClsErr } = await supabase.from('classes').delete().eq('id', classId);
      if (delClsErr) throw delClsErr;

      logAudit({
        action: 'class.delete',
        targetId: classId,
        targetType: 'class',
        targetName: classDeleteTarget.name,
        summary: `Permanently deleted class "${classDeleteTarget.name}" along with its students and related data.`,
      });

      toast.success(`Class ${classDeleteTarget.name} and all related records permanently deleted`);
      setShowClassDependencyDialog(false);
      setClassDeleteTarget(null);
      refetchClasses();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to permanently delete class and its dependencies');
    } finally {
      setClassDeleteLoading(false);
    }
  };

  // INLINE SUBJECT CREATION IN CLASS CARD
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [addSubjectClassId, setAddSubjectClassId] = useState('');
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', category: 'STEM', icon: 'menu_book' });
  const [subjectCreateLoading, setSubjectCreateLoading] = useState(false);

  const handleAddSubjectClick = (classId: string) => {
    setAddSubjectClassId(classId);
    setSubjectForm({ name: '', code: '', category: 'STEM', icon: 'menu_book' });
    setShowAddSubject(true);
  };

  const handleAddSubject = async () => {
    if (subjectCreateLoading) return;
    if (!subjectForm.name || !subjectForm.code) {
      toast.error('Please fill in subject name and code');
      return;
    }
    const code = subjectForm.code.toUpperCase();
    const duplicate = subjects.find((s) => s.code === code && s.classId === addSubjectClassId && s.isActive !== false);
    if (duplicate) {
      toast.error(`Subject code "${code}" is already in use in this class`);
      return;
    }
    setSubjectCreateLoading(true);
    try {
      await api.post('/subjects', {
        name: subjectForm.name,
        code,
        thumbnail: subjectForm.icon,
        category: subjectForm.category,
        classId: addSubjectClassId,
      });

      setShowAddSubject(false);
      toast.success(`Subject ${subjectForm.name} added`);
      refetchSubjects();
      refetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add subject');
    } finally {
      setSubjectCreateLoading(false);
    }
  };

  // INLINE ASSIGN & REGISTER TEACHER
  const [showAssign, setShowAssign] = useState(false);
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [registerNewTeacherInline, setRegisterNewTeacherInline] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const handleAssignClick = (classId: string, subjectId: string) => {
    setAssignClassId(classId);
    setAssignSubjectId(subjectId);
    setSelectedTeacherId('');
    setRegisterNewTeacherInline(false);
    setNewTeacherName('');
    setShowAssign(true);
  };

  const handleAssignTeacher = async () => {
    setAssignLoading(true);
    try {
      const teacherId = selectedTeacherId;

      if (!teacherId) {
        toast.error('Please select a teacher');
        setAssignLoading(false);
        return;
      }

      await teacherClassSubjectService.assign({
        teacherId,
        classId: assignClassId,
        subjectId: assignSubjectId,
      });
      // Invalidate query cache to trigger immediate UI re-render
      queryClient.invalidateQueries({ queryKey: ['admin-tc-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      await Promise.all([refetchTCAssignments(), refetchUsers()]);
      setShowAssign(false);
      toast.success('Teacher assigned successfully');
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
      queryClient.invalidateQueries({ queryKey: ['admin-tc-assignments'] });
      await refetchTCAssignments();
      toast.success('Teacher assignment removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove assignment');
    }
  };


// INLINE REGISTER STUDENT FOR A CLASS
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addStudentClassId, setAddStudentClassId] = useState('');
  const [studentForm, setStudentForm] = useState({ displayName: '', phone: '', rollNo: '', gender: '' });
  const [studentRegisterLoading, setStudentRegisterLoading] = useState(false);

  const getNextRollNo = (classId: string) => {
    const classStudents = users.filter((u: UserDoc) => hasRole(u.role, 'student') && u.classId === classId);
    if (classStudents.length === 0) return 1;
    const rolls = classStudents.map((s: UserDoc) => s.rollNo).filter((r): r is number => typeof r === 'number');
    if (rolls.length === 0) return 1;
    return Math.max(...rolls) + 1;
  };

  const handleAddStudentClick = (cls: ClassEntry) => {
    setAddStudentClassId(cls.id);
    const nextRoll = getNextRollNo(cls.id);
    setStudentForm({
      displayName: '',
      phone: '',
      rollNo: String(nextRoll),
      gender: '',
    });
    setShowAddStudent(true);
  };

  const handleRegisterStudent = async () => {
    if (!studentForm.displayName || !studentForm.rollNo) {
      toast.error('Please enter name and roll number');
      return;
    }
    setStudentRegisterLoading(true);
    try {
      const res = await userService.create({
        displayName: studentForm.displayName,
        phone: studentForm.phone.trim() || undefined,
        role: 'student',
        classId: addStudentClassId,
        rollNo: parseInt(studentForm.rollNo, 10),
        gender: studentForm.gender || undefined,
      });

      const studentData = res.data as any;
      setCreatedCredentials({
        displayName: studentData.displayName,
        email: (studentData as any).phone_number || studentData.phoneNumber || studentData.email,
        generatedPassword: studentData.generatedPassword,
        studentId: studentData.studentId,
      });

      setShowAddStudent(false);
      toast.success(`Student ${studentForm.displayName} registered`);
      refetchUsers();
      refetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register student');
    } finally {
      setStudentRegisterLoading(false);
    }
  };

  // PROMOTE STUDENTS
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);

  const handlePromoteStudents = async () => {
    setPromoteLoading(true);
    try {
      const res = await api.post('/academic-years/promote');
      const data = res.data?.data || res.data;
      toast.success(`Promoted ${data?.promoted || 0} students, graduated ${data?.graduated || 0}`);
      setShowPromoteConfirm(false);
      refetchUsers();
      refetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote students');
    } finally {
      setPromoteLoading(false);
    }
  };

  // Helpers
  const getClassSubjects = (classId: string) => subjects.filter((s) => s.classId === classId);
  const getClassStudents = (classId: string) => users.filter((u) => hasRole(u.role, 'student') && u.classId === classId);
  const getSubjectTeacher = (classId: string, subjectId: string): UserDoc | undefined => {
    const assignment = tcAssignments.find((a) => a.classId === classId && a.subjectId === subjectId);
    if (!assignment) return undefined;
    return users.find((u) => u.id === assignment.teacherId);
  };

  // -------------------------------------------------------------
  // TAB 2: TEACHERS
  // -------------------------------------------------------------
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ displayName: '', phone: '' });
  const [teacherRegisterLoading, setTeacherRegisterLoading] = useState(false);
  const [userDeleteTarget, setUserDeleteTarget] = useState<UserDoc | null>(null);
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);
  const [userDependencyReport, setUserDependencyReport] = useState<DependencyReport | null>(null);
  const [showUserDependencyDialog, setShowUserDependencyDialog] = useState(false);

  const teachers = useMemo(() => users.filter((u) => hasRole(u.role, 'teacher')), [users]);
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = teacherSearch.toLowerCase();
      return (t.displayName?.toLowerCase() || '').includes(q) || ((t as any).phone_number?.toLowerCase() || '').includes(q) || (t.phone?.toLowerCase() || '').includes(q);
    });
  }, [teachers, teacherSearch]);

  const handleCreateTeacher = async () => {
    if (!teacherForm.displayName) {
      toast.error('Please enter teacher name');
      return;
    }
    setTeacherRegisterLoading(true);
    try {
      const res = await userService.create({
        displayName: teacherForm.displayName,
        phone: teacherForm.phone.trim() || undefined,
        role: 'teacher',
      });

      const teacherData = res.data as any;
      setCreatedCredentials({
        displayName: teacherData.displayName,
        email: teacherData.phone_number || teacherData.phoneNumber || teacherData.email,
        generatedPassword: teacherData.generatedPassword,
      });

      setShowCreateTeacher(false);
      setTeacherForm({ displayName: '', phone: '' });
      if (!teacherData.generatedPassword) {
        toast.success('Teacher exists — account reused');
      } else {
        toast.success('Teacher registered successfully');
      }
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create teacher');
    } finally {
      setTeacherRegisterLoading(false);
    }
  };

  const handleToggleUserActive = async (user: UserDoc) => {
    try {
      await userService.toggleActive(user.id);
      toast.success(`User status updated`);
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleUserDeleteClick = async (u: UserDoc) => {
    setUserDeleteTarget(u);
    setUserDeleteLoading(true);
    setUserDependencyReport(null);
    setShowUserDependencyDialog(true);
    try {
      const report = await getUserDependencies(u.id);
      setUserDependencyReport(report);
    } catch {
      setUserDependencyReport(null);
    }
    setUserDeleteLoading(false);
  };

  const handleConfirmUserDelete = async () => {
    if (!userDeleteTarget) return;
    setUserDeleteLoading(true);
    try {
      await userService.delete(userDeleteTarget.id);
      toast.success('User permanently deleted');
      setShowUserDependencyDialog(false);
      setUserDeleteTarget(null);
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setUserDeleteLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: STUDENTS
  // -------------------------------------------------------------
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [studentPage, setStudentPage] = useState(1);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editStudentTarget, setEditStudentTarget] = useState<UserDoc | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({ displayName: '', rollNo: '', classId: '' });
  const [studentSaveLoading, setStudentSaveLoading] = useState(false);

  const students = useMemo(() => users.filter((u) => hasRole(u.role, 'student')), [users]);
  const classOptions = useMemo(() => fetchedClasses.map((c) => {
    const capName = c.name.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const label = c.section ? `${capName}-Section ${c.section}` : capName;
    return { value: c.id, label };
  }), [fetchedClasses]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const nameMatch = (s.displayName || '').toLowerCase().includes(studentSearch.toLowerCase());
      const emailMatch = (s.email || '').toLowerCase().includes(studentSearch.toLowerCase());
      const classMatch = studentClassFilter === 'all' || s.classId === studentClassFilter;
      return (nameMatch || emailMatch) && classMatch;
    });
  }, [students, studentSearch, studentClassFilter]);

  const paginatedStudents = useMemo(() => {
    const limit = 10;
    const offset = (studentPage - 1) * limit;
    return filteredStudents.slice(offset, offset + limit);
  }, [filteredStudents, studentPage]);

  const studentTotalPages = Math.ceil(filteredStudents.length / 10);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, studentClassFilter]);

  const handleEditStudentClick = (student: UserDoc) => {
    setEditStudentTarget(student);
    setEditStudentForm({
      displayName: student.displayName || '',
      rollNo: student.rollNo ? String(student.rollNo) : '',
      classId: student.classId || '',
    });
    setShowEditStudent(true);
  };

  const handleUpdateStudent = async () => {
    if (!editStudentTarget || !editStudentForm.displayName || !editStudentForm.classId || !editStudentForm.rollNo) {
      toast.error('Please fill in displayName, class and roll number');
      return;
    }
    setStudentSaveLoading(true);
    try {
      await userService.update(editStudentTarget.id, {
        displayName: editStudentForm.displayName,
        classId: editStudentForm.classId,
        rollNo: parseInt(editStudentForm.rollNo, 10),
      });
      toast.success('Student updated successfully');
      setShowEditStudent(false);
      setEditStudentTarget(null);
      refetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update student');
    } finally {
      setStudentSaveLoading(false);
    }
  };

  return (
    <>
      <SEOHead title="Classes Hub" description="Unified classes, teachers, and student rosters" canonical="/admin/classes" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-7xl mx-auto pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0} className="space-y-16">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-headline-sm font-bold">Classes Hub</h1>
              <p className="text-body-md text-muted-foreground">Manage classes, subjects, teacher assignments, and rosters</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefreshAll}>
              <Icon name="refresh" size={16} className="mr-1" />
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowPromoteConfirm(true)}>
              <Icon name="trending_up" size={16} className="mr-1" />
              Promote Students
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-md overflow-x-auto inline-flex">
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            {/* -------------------------------------------------------------
                TABS CONTENT: CLASSES
               ------------------------------------------------------------- */}
            <TabsContent value="classes" className="mt-4 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="relative max-w-sm flex-1">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search classes..."
                    className="pl-10 border-border/60 placeholder:text-muted-foreground"
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                  />
                </div>
                <Button onClick={() => setShowCreateClass(true)}>
                  <Icon name="add" size={18} className="mr-2" />
                  Create Class
                </Button>
              </div>

              <DataFetchWrapper
                data={fetchedClasses}
                isLoading={classesLoading}
                error={classesError ? new Error('Failed to load classes') : null}
                onRetry={refetchClasses}
                loadingType="card"
                emptyMessage="No classes yet"
              >
                {() => (
                  <div>
                    {filteredClasses.length === 0 ? (
                      <Card className="border-border/60">
                        <CardContent className="flex flex-col items-center gap-4 py-16">
                          <Icon name="search_off" size={48} className="text-muted-foreground/50" />
                          <p className="text-title-sm font-medium">No classes match your search</p>
                          <Button variant="outline" size="sm" onClick={() => setClassSearch('')}>Clear Search</Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                        {filteredClasses.map((cls) => {
                          const isExpanded = expandedId === cls.id;
                          const classSubjects = getClassSubjects(cls.id);
                          const classStudents = getClassStudents(cls.id);

                          return (
                            <Card key={cls.id} className="border-border/60 hover:shadow-elevation-2 transition-all">
                              <div className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : cls.id)}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center">
                                        <Icon name="class" size={20} className="text-on-primary-container" />
                                      </div>
                                      <div>
                                        <CardTitle className="text-title-md">{cls.name}</CardTitle>
                                        <Badge variant="outline" className="text-[10px] mt-0.5">{cls.code}</Badge>
                                      </div>
                                    </div>
                                    <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={20} className="text-muted-foreground" />
                                  </div>
                                </CardHeader>

                                <CardContent className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-md">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Icon name="school" size={16} />
                                      <span>Grade {cls.grade || '\u2014'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Icon name="people" size={16} />
                                      <span>{classStudents.length} students</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Icon name="menu_book" size={16} />
                                      <span>{classSubjects.length} subjects</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Icon name="meeting_room" size={16} />
                                      <span>Room {cls.roomNumber || '\u2014'}</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </div>

                              {isExpanded && (
                                <div className="border-t border-border/60 px-5 pb-4 pt-3 space-y-4 bg-muted/10">
                                  {/* Subjects & Teachers Assignment */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-label-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Icon name="menu_book" size={14} />
                                        Subjects
                                      </h4>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-primary px-2 hover:bg-primary/10"
                                        onClick={(e) => { e.stopPropagation(); handleAddSubjectClick(cls.id); }}
                                      >
                                        <Icon name="add" size={14} className="mr-1" />
                                        Add Subject
                                      </Button>
                                    </div>
                                    {classSubjects.length === 0 ? (
                                      <p className="text-label-xs text-muted-foreground/60 ml-6 py-1">No subjects created yet</p>
                                    ) : (
                                      <ul className="space-y-1.5">
                                        {classSubjects.map((subject) => {
                                          const teacher = getSubjectTeacher(cls.id, subject.id);
                                          return (
                                            <li key={subject.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/40 border border-border/20">
                                              <span className="font-medium">{subject.name} ({subject.code})</span>
                                              <div className="flex items-center gap-2">
                                                {teacher ? (
                                                  <div className="flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-border">
                                                    <span className="text-muted-foreground text-xs flex items-center gap-1 font-semibold">
                                                      <Icon name="person" size={12} className="text-primary" />
                                                      {teacher.displayName}
                                                    </span>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-5 w-5 p-0 text-error hover:bg-error/15 rounded-full"
                                                      title="Remove Teacher Assignment"
                                                      onClick={(e) => { e.stopPropagation(); handleRemoveTeacherAssignment(cls.id, subject.id); }}
                                                    >
                                                      <Icon name="close" size={12} />
                                                    </Button>
                                                  </div>
                                                ) : (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-[10px] py-0 px-2 flex items-center gap-0.5 font-bold text-primary border-primary/30 hover:bg-primary/5 bg-background"
                                                    onClick={(e) => { e.stopPropagation(); handleAssignClick(cls.id, subject.id); }}
                                                  >
                                                    <Icon name="person_add" size={10} />
                                                    Assign Teacher
                                                  </Button>
                                                )}
                                              </div>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </div>

                                  {/* Student Roster inside class card */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-label-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Icon name="people" size={14} />
                                        Students ({classStudents.length})
                                      </h4>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-primary px-2 hover:bg-primary/10"
                                        onClick={(e) => { e.stopPropagation(); handleAddStudentClick(cls); }}
                                      >
                                        <Icon name="person_add" size={14} className="mr-1" />
                                        Register Student
                                      </Button>
                                    </div>
                                    {classStudents.length === 0 ? (
                                      <p className="text-label-xs text-muted-foreground/60 ml-6 py-1">No students registered yet</p>
                                    ) : (
                                      <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                        {classStudents.map((student) => (
                                          <li key={student.id} className="flex items-center justify-between text-xs py-1 px-3 rounded-lg bg-muted/30">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-muted-foreground">Roll #{student.rollNo ?? '\u2014'}</span>
                                              <span className="font-medium">{student.displayName}</span>
                                            </div>
                                            {student.studentId && (
                                              <Badge variant="outline" className="text-[9px] font-mono select-all bg-background">{student.studentId}</Badge>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Card Footer Actions */}
                              <div className="px-5 pb-4 flex items-center gap-2 pt-2 border-t border-border/10">
                                <Button variant="ghost" size="sm" onClick={() => handleEditClassClick(cls)} title="Edit Class Details">
                                  <Icon name="edit" size={16} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteClassClick(cls.id, cls.name)} title="Archive/Delete Class">
                                  <Icon name="delete" size={16} className="text-error" />
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </DataFetchWrapper>
            </TabsContent>

            {/* -------------------------------------------------------------
                TABS CONTENT: TEACHERS
               ------------------------------------------------------------- */}
            <TabsContent value="teachers" className="mt-4 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="relative max-w-sm flex-1">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search teachers..."
                    className="pl-10 border-border/60 placeholder:text-muted-foreground"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                  />
                </div>
                <Button onClick={() => setShowCreateTeacher(true)}>
                  <Icon name="add" size={16} className="mr-2" />
                  Register Teacher
                </Button>
              </div>

              {filteredTeachers.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="flex flex-col items-center gap-4 py-16">
                    <Icon name="badge" size={48} className="text-muted-foreground/50" />
                    <p className="text-title-sm font-medium">No teachers found</p>
                    <Button variant="outline" size="sm" onClick={() => setTeacherSearch('')}>Clear Search</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="border border-border/60 rounded-xl overflow-x-auto bg-surface">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Name</th>
                          <th className="text-left px-4 py-3">Phone</th>
                        <th className="text-left px-4 py-3">Assigned Classes</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredTeachers.map((teacher) => {
                        const teacherAssignments = tcAssignments.filter((a) => 
                          a.teacherId === teacher.id &&
                          fetchedClasses.some((cls) => cls.id === a.classId) &&
                          subjects.some((sub) => sub.id === a.subjectId)
                        );
                        return (
                          <tr key={teacher.id} className="hover:bg-muted/20 transition-colors text-body-md">
                            <td className="px-4 py-3 font-semibold">{teacher.displayName}</td>
                              <td className="px-4 py-3 font-mono text-sm select-all">{(teacher as any).phone_number || teacher.phone || '—'}</td>
                            <td className="px-4 py-3">
                              {teacherAssignments.length === 0 ? (
                                <span className="text-label-xs text-muted-foreground/60">No assignments</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {teacherAssignments.map((a) => {
                                    const c = fetchedClasses.find((cls) => cls.id === a.classId)!;
                                    const s = subjects.find((sub) => sub.id === a.subjectId)!;
                                    return (
                                      <Badge key={a.id} variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                                        {c.code} - {s.name}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={teacher.isActive === false ? 'destructive' : 'success'} className="text-[10px]">
                                {teacher.isActive === false ? 'Inactive' : 'Active'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleToggleUserActive(teacher)}
                                title={teacher.isActive === false ? 'Enable Account' : 'Disable Account'}
                              >
                                <Icon name={teacher.isActive === false ? 'toggle_off' : 'toggle_on'} size={18} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-error hover:bg-error/10"
                                onClick={() => handleUserDeleteClick(teacher)}
                                title="Delete Teacher"
                              >
                                <Icon name="delete" size={16} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* -------------------------------------------------------------
                TABS CONTENT: STUDENTS
               ------------------------------------------------------------- */}
            <TabsContent value="students" className="mt-4 space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search students..."
                    className="pl-10 border-border/60 placeholder:text-muted-foreground"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <OptionsSelect
                  options={[{ value: 'all', label: 'All Classes' }, ...classOptions]}
                  value={studentClassFilter}
                  onChange={setStudentClassFilter}
                  className="w-44 bg-surface"
                />
                <button
                  className="text-sm text-primary hover:underline font-semibold"
                  onClick={() => { setStudentSearch(''); setStudentClassFilter('all'); }}
                >
                  Reset
                </button>
              </div>

              {filteredStudents.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="flex flex-col items-center gap-4 py-16">
                    <Icon name="person_off" size={48} className="text-muted-foreground/50" />
                    <p className="text-title-sm font-medium">No students found</p>
                    <Button variant="outline" size="sm" onClick={() => { setStudentSearch(''); setStudentClassFilter('all'); }}>Clear Filters</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="border border-border/60 rounded-xl overflow-x-auto bg-surface">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                          <th className="text-left px-4 py-3">Name</th>
                          <th className="text-left px-4 py-3">Student ID</th>
                          <th className="text-left px-4 py-3">Class</th>
                          <th className="text-left px-4 py-3">Roll No</th>
                        <th className="text-left px-4 py-3">Phone</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-right px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-body-md">
                        {paginatedStudents.map((student) => {
                          const classObj = fetchedClasses.find((c) => c.id === student.classId);
                          return (
                            <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-semibold">{student.displayName}</td>
                              <td className="px-4 py-3 font-mono text-sm font-semibold text-primary">{student.studentId || '\u2014'}</td>
                              <td className="px-4 py-3">{classObj ? classObj.name : '\u2014'}</td>
                              <td className="px-4 py-3 font-semibold">{student.rollNo ?? '\u2014'}</td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground select-all">{(student as any).phone_number || student.phone || '—'}</td>
                              <td className="px-4 py-3">
                                <Badge variant={student.isActive === false ? 'destructive' : 'success'} className="text-[10px]">
                                  {student.isActive === false ? 'Inactive' : 'Active'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleEditStudentClick(student)}
                                  title="Edit Student details"
                                >
                                  <Icon name="edit" size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleToggleUserActive(student)}
                                  title={student.isActive === false ? 'Enable student account' : 'Disable student account'}
                                >
                                  <Icon name={student.isActive === false ? 'toggle_off' : 'toggle_on'} size={18} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleUserDeleteClick(student)}
                                  title="Delete student"
                                >
                                  <Icon name="delete" size={16} className="text-error" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {studentTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Button variant="outline" size="icon" disabled={studentPage <= 1} onClick={() => setStudentPage(p => p - 1)}>
                        <Icon name="chevron_left" size={18} />
                      </Button>
                      {Array.from({ length: studentTotalPages }, (_, i) => (
                        <Button
                          key={i + 1}
                          variant={studentPage === i + 1 ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8 text-xs font-semibold"
                          onClick={() => setStudentPage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button variant="outline" size="icon" disabled={studentPage >= studentTotalPages} onClick={() => setStudentPage(p => p + 1)}>
                        <Icon name="chevron_right" size={18} />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* -------------------------------------------------------------
          SHARED DIALOGS
         ------------------------------------------------------------- */}

      {/* CREATE CLASS DIALOG */}
      <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
            <DialogDescription>Set up a new class by entering the grade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={classGrade}
                onChange={(e) => handleClassGradeChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Class Code (Auto-filled)</Label>
              <Input value={classCode} onChange={(e) => setClassCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Section (Optional)</Label>
              <Input 
                placeholder="e.g. A" 
                value={classSection} 
                onChange={(e) => {
                  const val = e.target.value;
                  setClassSection(val);
                  if (/^\d+$/.test(classGrade.trim())) {
                    setClassCode(`G${classGrade.trim()}${val.trim().toUpperCase()}`);
                  }
                }} 
              />
            </div>
            <div className="space-y-2">
              <Label>Room Number (Optional)</Label>
              <Input placeholder="e.g. 201" value={classRoomNumber} onChange={(e) => setClassRoomNumber(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateClass(false)}>Cancel</Button>
            <Button onClick={handleCreateClass} disabled={!classGrade.trim() || classCreateLoading}>
              {classCreateLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT CLASS DIALOG */}
      <Dialog open={showEditClass} onOpenChange={(o) => { if (!o) { setShowEditClass(false); setEditClassTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update class details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input value={editClassForm.name} onChange={(e) => setEditClassForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={editClassForm.code} onChange={(e) => setEditClassForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input value={editClassForm.grade} onChange={(e) => setEditClassForm((f) => ({ ...f, grade: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input value={editClassForm.section} onChange={(e) => setEditClassForm((f) => ({ ...f, section: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input value={editClassForm.roomNumber} onChange={(e) => setEditClassForm((f) => ({ ...f, roomNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditClass(false); setEditClassTarget(null); }}>Cancel</Button>
            <Button onClick={handleUpdateClass} disabled={!editClassForm.name || !editClassForm.code}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLASS DEPENDENCY & DELETE DIALOG */}
      <Dialog open={showClassDependencyDialog} onOpenChange={(o) => { if (!o) { setShowClassDependencyDialog(false); setClassDeleteTarget(null); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Delete {classDeleteTarget?.name || 'Class'}</DialogTitle>
            <DialogDescription>
              {classDeleteLoading ? (
                <span className="flex items-center gap-2">
                  <Icon name="sync" size={16} className="animate-spin" />
                  Checking dependencies...
                </span>
              ) : classDependencyReport && classDependencyReport.totalDependents > 0 ? (
                <span className="text-destructive font-medium">{classDependencyReport.totalDependents} active dependencies found. Archiving recommended.</span>
              ) : classDependencyReport ? (
                <span className="text-success font-medium">No dependencies found. Safe to delete.</span>
              ) : (
                'Unable to check dependencies.'
              )}
            </DialogDescription>
          </DialogHeader>

          {classDependencyReport && classDependencyReport.categories.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border p-4">
              <p className="text-label-sm font-medium text-muted-foreground uppercase tracking-wider">Impact Summary</p>
              {classDependencyReport.categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between text-body-md font-medium">
                  <span>{cat.label}</span>
                  <Badge variant="outline">{cat.count}</Badge>
                </div>
              ))}
            </div>
          )}

          {classDependencyReport && classDependencyReport.totalDependents > 0 && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 text-body-sm font-medium leading-normal flex items-start gap-2">
              <Icon name="warning" size={16} className="shrink-0 mt-0.5" />
              <span>
                Warning: Permanent deletion will delete all assigned students and related academic history.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="tonal" className="w-full justify-start" onClick={handleArchiveClass} disabled={classDeleteLoading}>
              <Icon name="archive" size={16} className="mr-2" />
              Archive Class (Recommended)
              <span className="ml-auto text-label-xs text-muted-foreground">Preserves student records</span>
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={handleConfirmDeleteClass} disabled={classDeleteLoading}>
              <Icon name="delete_forever" size={16} className="mr-2" />
              Permanently Delete
              <span className="ml-auto text-label-xs text-muted-foreground">Irreversible</span>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setShowClassDependencyDialog(false); setClassDeleteTarget(null); }}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ADD SUBJECT DIALOG (inside class) */}
      <Dialog open={showAddSubject} onOpenChange={(o) => { if (!o) { setShowAddSubject(false); setSubjectForm({ name: '', code: '', category: 'STEM', icon: 'menu_book' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject to Class</DialogTitle>
            <DialogDescription>Create a new subject for this class.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input placeholder="Computer Science" value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input placeholder="CS" value={subjectForm.code} onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <OptionsSelect options={subjectIconOptions} placeholder="Select icon" value={subjectForm.icon} onChange={(v: string) => setSubjectForm((f) => ({ ...f, icon: v }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <OptionsSelect options={subjectCategoryOptions} placeholder="Select category" value={subjectForm.category} onChange={(v: string) => setSubjectForm((f) => ({ ...f, category: v }))} />
            </div>
            <Button className="w-full" onClick={handleAddSubject} disabled={subjectCreateLoading}>
              <Icon name="add" size={16} className="mr-2" />{subjectCreateLoading ? 'Adding...' : 'Add Subject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ASSIGN TEACHER DIALOG */}
      <Dialog open={showAssign} onOpenChange={(o) => { if (!o) { setShowAssign(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
            <DialogDescription>Select an existing teacher.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Teacher</Label>
              <OptionsSelect
                options={users.filter((u) => hasRole(u.role, 'teacher')).map((t) => ({ value: t.id, label: t.displayName }))}
                placeholder="Choose a teacher..."
                value={selectedTeacherId}
                onChange={(v: string) => setSelectedTeacherId(v)}
              />
            </div>
            <Button className="w-full" onClick={handleAssignTeacher} disabled={assignLoading || !selectedTeacherId}>
              {assignLoading ? 'Assigning...' : 'Assign Teacher'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* REGISTER STUDENT DIALOG */}
      <Dialog open={showAddStudent} onOpenChange={(o) => { if (!o) { setShowAddStudent(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Student</DialogTitle>
            <DialogDescription>Create a new student account for this class.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student Name</Label>
              <Input placeholder="John Doe" value={studentForm.displayName} onChange={(e) => setStudentForm((f) => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Roll Number</Label>
              <Input type="number" value={studentForm.rollNo} onChange={(e) => setStudentForm((f) => ({ ...f, rollNo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <OptionsSelect
                placeholder="Select Gender"
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                value={studentForm.gender}
                onChange={(v: string) => setStudentForm((f) => ({ ...f, gender: v }))}
              />
            </div>
            <Button className="w-full" onClick={handleRegisterStudent} disabled={studentRegisterLoading || !studentForm.displayName || !studentForm.gender}>
              {studentRegisterLoading ? 'Registering...' : 'Register Student'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* REGISTER TEACHER DIALOG */}
      <Dialog open={showCreateTeacher} onOpenChange={(o) => { if (!o) { setShowCreateTeacher(false); setTeacherForm({ displayName: '', phone: '' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Teacher</DialogTitle>
            <DialogDescription>Create a new teacher profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Teacher Name</Label>
              <Input placeholder="Jane Doe" value={teacherForm.displayName} onChange={(e) => setTeacherForm((f) => ({ ...f, displayName: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleCreateTeacher} disabled={teacherRegisterLoading || !teacherForm.displayName}>
              {teacherRegisterLoading ? 'Registering...' : 'Register Teacher'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* USER DEPENDENCY & DELETE DIALOG (for teacher) */}
      <Dialog open={showUserDependencyDialog} onOpenChange={(o) => { if (!o) { setShowUserDependencyDialog(false); setUserDeleteTarget(null); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Delete {userDeleteTarget?.displayName || 'User'}</DialogTitle>
            <DialogDescription>
              {userDeleteLoading ? (
                <span className="flex items-center gap-2">
                  <Icon name="sync" size={16} className="animate-spin" />
                  Checking dependencies...
                </span>
              ) : userDependencyReport && userDependencyReport.totalDependents > 0 ? (
                <span className="text-destructive font-medium">{userDependencyReport.totalDependents} active dependencies. Deactivation recommended.</span>
              ) : userDependencyReport ? (
                <span className="text-success font-medium">No dependencies found. Safe to delete.</span>
              ) : (
                'Unable to check dependencies.'
              )}
            </DialogDescription>
          </DialogHeader>

          {userDependencyReport && userDependencyReport.categories.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border p-4">
              <p className="text-label-sm font-medium text-muted-foreground uppercase tracking-wider">Impact Summary</p>
              {userDependencyReport.categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between text-body-md font-medium">
                  <span>{cat.label}</span>
                  <Badge variant="outline">{cat.count}</Badge>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="tonal" className="w-full justify-start" onClick={async () => { if (userDeleteTarget) { await handleToggleUserActive(userDeleteTarget); setShowUserDependencyDialog(false); } }}>
              <Icon name="toggle_off" size={16} className="mr-2" />
              Toggle Active Status
              <span className="ml-auto text-label-xs text-muted-foreground">Preserves records</span>
            </Button>
            <Button variant="destructive" className="w-full justify-start" onClick={handleConfirmUserDelete} disabled={userDeleteLoading || (userDependencyReport?.totalDependents ?? 0) > 0}>
              <Icon name="delete_forever" size={16} className="mr-2" />
              Permanently Delete
              <span className="ml-auto text-label-xs text-muted-foreground">{(userDependencyReport?.totalDependents ?? 0) > 0 ? 'Has dependencies' : 'Irreversible'}</span>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setShowUserDependencyDialog(false); setUserDeleteTarget(null); }}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT STUDENT DIALOG */}
      <Dialog open={showEditStudent} onOpenChange={(o) => { if (!o) { setShowEditStudent(false); setEditStudentTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editStudentForm.displayName} onChange={(e) => setEditStudentForm((f) => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <OptionsSelect options={classOptions} placeholder="Select Class" value={editStudentForm.classId} onChange={(v: string) => setEditStudentForm((f) => ({ ...f, classId: v }))} />
              </div>
              <div className="space-y-2">
                <Label>Roll Number</Label>
                <Input type="number" value={editStudentForm.rollNo} onChange={(e) => setEditStudentForm((f) => ({ ...f, rollNo: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full" onClick={handleUpdateStudent} disabled={studentSaveLoading}>
              {studentSaveLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PROMOTE STUDENTS CONFIRMATION */}
      <Dialog open={showPromoteConfirm} onOpenChange={setShowPromoteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Icon name="warning" size={24} />
              Promote All Students?
            </DialogTitle>
            <DialogDescription>
              This will promote every student to the next class and graduate those in the highest class.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteConfirm(false)} disabled={promoteLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handlePromoteStudents} disabled={promoteLoading}>
              {promoteLoading ? 'Promoting...' : 'Yes, Promote All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREDENTIALS DIALOG */}
      <Dialog open={!!createdCredentials} onOpenChange={(o) => { if (!o) setCreatedCredentials(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Icon name="check_circle" size={24} />
              Credentials Generated
            </DialogTitle>
            <DialogDescription>Please copy these credentials. This is the only time the password is shown.</DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 bg-muted/40 p-4 rounded-lg border border-border font-mono text-sm">
              {createdCredentials.displayName && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-border/60 pb-2">
                  <span className="font-bold text-muted-foreground">Name:</span>
                  <span className="sm:col-span-1 col-span-2 select-all font-sans font-medium">{createdCredentials.displayName}</span>
                </div>
              )}
              {createdCredentials.studentId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-border/60 pb-2">
                  <span className="font-bold text-muted-foreground">Student ID:</span>
                  <span className="sm:col-span-1 col-span-2 select-all text-primary font-bold">{createdCredentials.studentId}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-border/60 pb-2">
                <span className="font-bold text-muted-foreground">Email:</span>
                <span className="sm:col-span-1 col-span-2 select-all">{createdCredentials.email}</span>
              </div>
              {createdCredentials.generatedPassword && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <span className="font-bold text-muted-foreground">Password:</span>
                  <span className="sm:col-span-1 col-span-2 select-all text-error font-bold bg-error-container/50 px-2 py-0.5 rounded">{createdCredentials.generatedPassword}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => {
              if (createdCredentials) {
                const parts: string[] = [];
                if (createdCredentials.displayName) parts.push(`Name: ${createdCredentials.displayName}`);
                if (createdCredentials.studentId) parts.push(`Student ID: ${createdCredentials.studentId}`);
                if (createdCredentials.email) parts.push(`Email: ${createdCredentials.email}`);
                if (createdCredentials.generatedPassword) parts.push(`Password: ${createdCredentials.generatedPassword}`);
                navigator.clipboard.writeText(parts.join('\n'));
                toast.success('Credentials copied to clipboard');
              }
            }}>
              <Icon name="content_copy" size={16} className="mr-2" />
              Copy Credentials
            </Button>
            <Button className="flex-1" onClick={() => setCreatedCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
