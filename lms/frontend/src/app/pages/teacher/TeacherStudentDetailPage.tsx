import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/Icon';
import { getInitials } from '@/lib/utils';
import { formatDate, getLetterGrade } from '@/lib/format';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import type { UserDoc, Subject, GradeEntry } from '@/services/dataService';
import { getUser, getClass, getAllSubjects, getGradesByStudent } from '@/services/dataService';

interface SubjectPerformance {
  id: string;
  name: string;
  code: string;
  color?: string;
  icon?: string;
  percentage: number;
}

interface GradeRow extends GradeEntry {
  subject: Subject | undefined;
  type: string;
}

interface StudentDetailData {
  student: UserDoc;
  studentClass: { id: string; name: string } | null;
  subjectPerformance: SubjectPerformance[];
  grades: GradeRow[];
  performanceTrend: GradeRow[];
}

function pctColor(pct: number) {
  return pct >= 80 ? 'text-on-success-container' : pct >= 60 ? 'text-on-warning-container' : 'text-on-error-container';
}

export default function TeacherStudentDetailPage() {
  const { _ } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['teacher-student-detail', id],
    queryFn: async (): Promise<StudentDetailData | null> => {
      if (!id) return null;

      const [student, allSubjects, grades] = await Promise.all([
        getUser(id),
        getAllSubjects(),
        getGradesByStudent(id),
      ]);

      if (!student) return null;

      const studentClass = student.classId ? await getClass(student.classId) : null;

      const gradesWithSubject: GradeRow[] = grades
        .map((g) => ({
          ...g,
          subject: allSubjects.find((s) => s.id === g.subjectId),
          type: (g as unknown as { type: string }).type ?? 'assignment',
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      const bySubject = new Map<string, { scores: number[]; totalPoints: number[] }>();
      grades.forEach((g) => {
        const existing = bySubject.get(g.subjectId ?? '') ?? {
          scores: [],
          totalPoints: [],
        };
        existing.scores.push(g.score);
        existing.totalPoints.push(g.totalPoints);
        bySubject.set(g.subjectId ?? '', existing);
      });

      const subjectPerformance: SubjectPerformance[] = [];
      for (const [subId, data] of bySubject) {
        const sub = allSubjects.find((s) => s.id === subId);
        if (!sub) continue;
        const totalScore = data.scores.reduce((a, b) => a + b, 0);
        const totalMax = data.totalPoints.reduce((a, b) => a + b, 0);
        const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        subjectPerformance.push({ id: sub.id, name: sub.name, code: sub.code, color: sub.color, icon: sub.icon, percentage });
      }

      const performanceTrend = [...gradesWithSubject]
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .slice(-10);

      return {
        student,
        studentClass: studentClass ? { id: studentClass.id, name: studentClass.name } : null,
        subjectPerformance,
        grades: gradesWithSubject,
        performanceTrend,
      };
    },
  });

  const notFound = !isLoading && !error && !data && !!id;

  return (
    <>
      <SEOHead
        title={data ? `${data.student.displayName} - ${_('Student Details')}` : _('Student Details')}
        description={data ? `${_('Performance and grades for')} ${data.student.displayName}` : _('View student details')}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32"
      >
        {notFound ? (
          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Icon name="person_off" size={48} className="text-muted-foreground/40" />
              <p className="text-lg font-medium">{_('Student not found')}</p>
              <p className="text-sm text-muted-foreground">
                {_("The student you're looking for doesn't exist.")}
              </p>
              <Button asChild>
                <Link to="/teacher/students">
                  <Icon name="arrow_back" size={16} className="mr-1" />
                  {_('Back to Students')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DataFetchWrapper
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            loadingType="detail"
          >
            {(d) => (
              <>
                <motion.div variants={cardStackReveal} custom={0}>
                  <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
                    <Link to="/teacher/students">
                      <Icon name="arrow_back" size={16} />
                      {_('Back to Students')}
                    </Link>
                  </Button>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-5">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-lg">{getInitials(d.student.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h1 className="text-headline-sm">{d.student.displayName}</h1>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon name="badge" size={15} />
                              {d.student.studentId}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="school" size={15} />
                              {d.studentClass?.name ?? _('Unknown Class')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="email" size={15} />
                              {d.student.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="menu_book" size={18} className="text-muted-foreground" />
                        {_('Subject Performance')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      {d.subjectPerformance.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="graded" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">{_('No grades recorded yet')}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                          {d.subjectPerformance.map((sub) => (
                            <div key={sub.id} className="p-3 rounded-lg border bg-card space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                                <p className="text-sm font-medium">{sub.name}</p>
                              </div>
                              <div className="flex items-end justify-between">
                                <p className={`text-2xl font-bold tabular-nums ${pctColor(sub.percentage)}`}>
                                  {sub.percentage}%
                                </p>
                                <Badge
                                  variant={sub.percentage >= 80 ? 'success' : sub.percentage >= 60 ? 'warning' : 'destructive'}
                                >
                                  {getLetterGrade(sub.percentage)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="graded" size={18} className="text-muted-foreground" />
                        {_('All Grades')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {d.grades.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <Icon name="graded" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">{_('No grades yet')}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left font-medium text-muted-foreground px-4 py-3">{_('Item')}</th>
                                <th className="text-left font-medium text-muted-foreground px-4 py-3">{_('Subject')}</th>
                                <th className="text-center font-medium text-muted-foreground px-4 py-3">{_('Score')}</th>
                                <th className="text-center font-medium text-muted-foreground px-4 py-3">{_('Percentage')}</th>
                                <th className="text-right font-medium text-muted-foreground px-4 py-3">{_('Date')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.grades.map((grade) => (
                                <tr key={grade.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{grade.itemName}</p>
                                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                                      {grade.type}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {grade.subject?.name ?? _('Unknown')}
                                  </td>
                                  <td className="px-4 py-3 text-center tabular-nums">
                                    {grade.score}/{grade.totalPoints}
                                  </td>
                                  <td className={`px-4 py-3 text-center font-semibold tabular-nums ${pctColor(grade.percentage)}`}>
                                    {grade.percentage}%
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                                    {formatDate(grade.createdAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="trending_up" size={18} className="text-muted-foreground" />
                        {_('Performance Trend')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      {d.performanceTrend.length < 2 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="show_chart" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">
                            {_('Need at least 2 graded items to show a trend')}
                          </p>
                        </div>
                      ) : (
                        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                          {d.performanceTrend.map((grade, idx) => {
                            const prevGrade = idx > 0 ? d.performanceTrend[idx - 1] : null;
                            const diff = prevGrade != null ? grade.percentage - prevGrade.percentage : null;
                            return (
                              <motion.div
                                key={grade.id}
                                variants={scrollReveal}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{grade.itemName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {grade.subject?.name ?? _('Unknown')} &middot; {formatDate(grade.createdAt)}
                                  </p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <span className={`font-semibold tabular-nums ${pctColor(grade.percentage)}`}>
                                    {grade.percentage}%
                                  </span>
                                  {diff != null && diff !== 0 && (
                                    <span className={`flex items-center text-xs font-medium tabular-nums ${diff > 0 ? 'text-on-success-container' : 'text-on-error-container'}`}>
                                      <Icon name={diff > 0 ? 'arrow_upward' : 'arrow_downward'} size={14} />
                                      {Math.abs(diff)}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="notes" size={18} className="text-muted-foreground" />
                        {_('Feedback & Notes')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {_('Add private notes about this student. These are only visible to you.')}
                        </p>
                        <Textarea placeholder={_('Write your notes here...')} className="min-h-[100px]" />
                        <div className="flex justify-end">
                          <Button size="sm" className="gap-1">
                            <Icon name="save" size={16} />
                            {_('Save Notes')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </DataFetchWrapper>
        )}
      </motion.div>
    </>
  );
}
