import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { getInitials } from '@/lib/utils';
import { getLetterGrade } from '@/lib/format';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import {
  getUserByRole,
  getAllClasses,
  getAllSubjects,
} from '@/services/dataService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { supabase } from '@/supabase/config';

interface StudentRow {
  id: string;
  displayName: string;
  studentId: string;
  className: string;
  overallPercentage: number;
  subjectCount: number;
}

export default function TeacherStudentsPage() {
  const { _ } = useTranslation();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['teacher-students'],
    queryFn: async () => {
      const [students, classes, subjects, quizAttempts, examAttempts, submissionAttempts, assignmentsRes] = await Promise.all([
        getUserByRole('student'),
        getAllClasses(),
        getAllSubjects(),
        supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2').then(r => r.data || []),
        supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2').then(r => r.data || []),
        supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2').then(r => r.data || []),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
      ]);
      return { students, classes, subjects, quizAttempts, examAttempts, submissionAttempts, assignments: assignmentsRes?.data ?? [] };
    },
  });

  const allStudents = data?.students ?? [];
  const allClasses = data?.classes ?? [];
  const allSubjects = data?.subjects ?? [];
  const myAssignments = data?.assignments ?? [];

  const attemptPcts = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const arr of [data?.quizAttempts ?? [], data?.examAttempts ?? [], data?.submissionAttempts ?? []]) {
      for (const a of arr) {
        const pct = (a as any)?.data?.percentage;
        const sid = (a as any)?.data?.studentId;
        if (pct == null || !sid) continue;
        if (!map.has(sid)) map.set(sid, []);
        map.get(sid)!.push(pct);
      }
    }
    return map;
  }, [data]);

  const myClassIds = useMemo(() => [...new Set(myAssignments.map((a) => a.classId))], [myAssignments]);
  const mySubjectIds = useMemo(() => [...new Set(myAssignments.map((a) => a.subjectId))], [myAssignments]);

  const teacherSubjects = useMemo(
    () => allSubjects.filter((s) => mySubjectIds.includes(s.id)),
    [allSubjects, mySubjectIds],
  );

  const subjectOptions = useMemo(
    () => [
      { value: 'all', label: _('All Subjects') },
      ...teacherSubjects.map((s) => ({ value: s.id, label: s.name })),
    ],
    [teacherSubjects],
  );

  const students = useMemo((): StudentRow[] => {
    const activeAssignments = selectedSubjectId === 'all'
      ? myAssignments
      : myAssignments.filter((a) => a.subjectId === selectedSubjectId);
    const activeClassIds = [...new Set(activeAssignments.map((a) => a.classId))];

    const filteredStudents = allStudents.filter(
      (u) => u.role === 'student' && u.classId && activeClassIds.includes(u.classId)
    );

    return filteredStudents
      .map((user) => {
        const studentClass = allClasses.find((c) => c.id === user.classId);
        const pcts = attemptPcts.get(user.id) || [];
        const overallPercentage = pcts.length > 0
          ? Math.round(pcts.reduce((sum, p) => sum + p, 0) / pcts.length)
          : 0;

        return {
          id: user.id,
          displayName: user.displayName,
          studentId: user.studentId ?? user.id,
          className: studentClass ? `${studentClass.name}${studentClass.section ? ` - ${studentClass.section}` : ''}` : _('Unknown'),
          overallPercentage,
          subjectCount: studentClass?.subjectIds?.length ?? 0,
        } as StudentRow;
      })
      .sort((a, b) => b.overallPercentage - a.overallPercentage);
  }, [selectedSubjectId, allStudents, allClasses, attemptPcts, myAssignments]);

  return (
    <>
      <SEOHead title={_('My Students')} description={_('View and manage your students')} canonical="/teacher/students" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32"
      >
        <motion.div
          variants={cardStackReveal}
          custom={0}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-headline-sm">{_('My Students')}</h1>
            <p className="text-sm text-muted-foreground">
              {students.length} {students.length !== 1 ? _('students total') : _('student total')}
            </p>
          </div>
          <div className="w-full sm:w-56">
            <OptionsSelect
              options={subjectOptions}
              placeholder={_('All Subjects')}
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
            />
          </div>
        </motion.div>

        <DataFetchWrapper
          data={students}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          loadingType="list"
          emptyMessage={
            allSubjects.length > 0
              ? _('No students found in the assigned classes.')
              : _('No subjects available. Contact your administrator.')
          }
          emptyAction={
            <Link to="/teacher/subjects" className="gap-1 inline-flex items-center">
              <Icon name="menu_book" size={16} />
              {_('View Subjects')}
            </Link>
          }
        >
          {(studentList) => (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
              {studentList.map((student) => {
                const letterGrade = getLetterGrade(student.overallPercentage);
                const isHighPerformer = student.overallPercentage >= 80;
                const isLowPerformer = student.overallPercentage < 60;

                return (
                  <motion.div key={student.id} variants={scrollReveal}>
                    <Link
                      to={`/teacher/students/${student.id}`}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block"
                    >
                      <Card className="border-border/60 hover:shadow-md transition-all duration-200 group cursor-pointer">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-11 w-11">
                              <AvatarFallback>{getInitials(student.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold truncate group-hover:text-primary transition-colors">
                                  {student.displayName}
                                </p>
                                <Badge
                                  variant={
                                    isHighPerformer
                                      ? 'success'
                                      : isLowPerformer
                                        ? 'destructive'
                                        : 'secondary'
                                  }
                                  className="text-[10px] flex-shrink-0"
                                >
                                  {letterGrade}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Icon name="badge" size={13} />
                                  {student.studentId}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Icon name="school" size={13} />
                                  {student.className}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Icon name="menu_book" size={13} />
                                  {student.subjectCount} {student.subjectCount !== 1 ? _('subjects') : _('subject')}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p
                                className={`text-lg font-bold tabular-nums ${
                                  isHighPerformer
                                    ? 'text-on-success-container'
                                    : isLowPerformer
                                      ? 'text-on-error-container'
                                      : ''
                                }`}
                              >
                                {student.overallPercentage}%
                              </p>
                              <p className="text-[10px] text-muted-foreground">{_('overall')}</p>
                            </div>
                            <Icon
                              name="chevron_right"
                              size={20}
                              className="text-muted-foreground/40 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
