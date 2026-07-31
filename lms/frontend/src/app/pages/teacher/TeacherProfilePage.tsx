import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { PerformanceLogoBadge } from '@/components/common/PerformanceLogoBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { Link } from 'react-router-dom';
import { getInitials } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { getAllSubjects, getAllClasses, getUserByRole, getAllGrades, getUser } from '@/services/dataService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import type { Subject, ClassEntry, GradeEntry } from '@/services/dataService';

interface ProfileData {
  user: import('@/services/dataService').UserDoc;
  stats: { totalStudents: number; totalClasses: number; totalSubjects: number; avgPerformance: number };
  assignedClasses: ClassEntry[];
  taughtSubjects: Subject[];
}

export default function TeacherProfilePage() {
  const { _ } = useTranslation();
  const authUser = useAuthStore((s) => s.user);

  const { data: raw, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher-profile', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) throw new Error('Not authenticated');
      const [firestoreUser, subjects, classes, students, grades, assignmentsRes] = await Promise.all([
        getUser(authUser.id),
        getAllSubjects(),
        getAllClasses(),
        getUserByRole('student'),
        getAllGrades(),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
      ]);
      if (!firestoreUser) throw new Error('User not found in Firestore');
      return { firestoreUser, subjects, classes, students, grades, assignments: assignmentsRes?.data ?? [] };
    },
    enabled: !!authUser,
  });

  const data: ProfileData = useMemo(() => {
    if (!raw) {
      return { stats: { totalStudents: 0, totalClasses: 0, totalSubjects: 0, avgPerformance: 0 }, assignedClasses: [], taughtSubjects: [], user: null! };
    }
    const { firestoreUser, subjects, classes, students, grades, assignments } = raw;
    const myClassIds = [...new Set(assignments.map((a) => a.classId))];
    const mySubjectIds = [...new Set(assignments.map((a) => a.subjectId))];

    const assignedClasses = classes.filter((c) => myClassIds.includes(c.id));
    const taughtSubjects = subjects.filter((s) => mySubjectIds.includes(s.id));
    const assignedStudents = students.filter((s) => s.classId && myClassIds.includes(s.classId));

    const avgPerformance = grades.length > 0 ? Math.round(grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length) : 0;
    return {
      user: firestoreUser,
      stats: {
        totalStudents: assignedStudents.length,
        totalClasses: assignedClasses.length,
        totalSubjects: taughtSubjects.length,
        avgPerformance,
      },
      assignedClasses,
      taughtSubjects,
    };
  }, [raw, authUser]);

  const statCards = [
    { icon: 'group', label: _('Students'), value: data.stats.totalStudents, bg: 'bg-primary-container', color: 'text-on-primary-container', isPerformanceLogo: false },
    { icon: 'school', label: _('Classes'), value: data.stats.totalClasses, bg: 'bg-secondary-container', color: 'text-on-secondary-container', isPerformanceLogo: false },
    { icon: 'menu_book', label: _('Subjects'), value: data.stats.totalSubjects, bg: 'bg-success-container', color: 'text-on-success-container', isPerformanceLogo: false },
  ];

  const avgPct = data.stats.avgPerformance;
  const avgStat = {
    icon: 'graded',
    label: _('Avg Performance'),
    value: `${avgPct}%`,
    bg: avgPct >= 80 ? 'bg-success-container' : avgPct >= 60 ? 'bg-warning-container' : 'bg-error-container',
    color: avgPct >= 80 ? 'text-on-success-container' : avgPct >= 60 ? 'text-on-warning-container' : 'text-on-error-container',
    isPerformanceLogo: true,
  };

  return (
    <>
      <SEOHead title={_('My Profile')} description={_('Teacher profile and statistics')} canonical="/teacher/profile" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="profile">
          {(profileData) => (
            <>
              <motion.div variants={cardStackReveal} custom={0}>
                <Card className="border-border/60 overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                  <CardContent className="p-5 -mt-12">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                      <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/20">
                        <AvatarFallback className="text-2xl">{getInitials(profileData.user.displayName ?? 'T')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-headline-sm">{profileData.user.displayName ?? _('Teacher')}</h1>
                        <p className="text-body-md text-muted-foreground">{profileData.user.email ?? ''}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                          <Badge variant="info" className="text-label-xs">
                            <Icon name="school" size={11} className="mr-1" />{_('Teacher')}
                          </Badge>
                          {profileData.user.id && (
                            <Badge variant="secondary" className="text-label-xs">{profileData.user.id}</Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link to={ROUTES.TEACHER_PROFILE_EDIT}><Icon name="edit" size={15} />{_('Edit Profile')}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[...statCards, avgStat].map((stat) => (
                    <Card key={stat.label} className="border-border/60">
                      <CardContent className="p-5 flex items-center gap-3">
                        {stat.isPerformanceLogo ? (
                          <PerformanceLogoBadge className={stat.bg} size={20} />
                        ) : (
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <Icon name={stat.icon} size={20} className={stat.color} />
                          </div>
                        )}
                        <div>
                          <p className="text-display-xs font-bold tabular-nums">{stat.value}</p>
                          <p className="text-label-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                <CardTitle className="text-title-sm flex items-center gap-2">
                  <Icon name="menu_book" size={18} className="text-muted-foreground" />{_('My Subjects')}
                </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profileData.taughtSubjects.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="book_off" size={32} className="text-muted-foreground/40" />
                          <p className="text-body-md text-muted-foreground">No subjects assigned</p>
                        </div>
                      ) : (
                        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                          {profileData.taughtSubjects.map((sub) => (
                            <motion.div key={sub.id} variants={cardStackReveal} custom={0} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors">
                              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${sub.color}15` }}>
                                <span style={{ color: sub.color }}><Icon name={sub.icon ?? 'menu_book'} size={18} /></span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-title-sm font-medium">{sub.name}</p>
                                <p className="text-label-xs text-muted-foreground">{sub.code} &middot; {sub.category}</p>
                              </div>
                              <Badge variant="secondary" className="text-label-xs">{sub.code}</Badge>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                <CardTitle className="text-title-sm flex items-center gap-2">
                  <Icon name="group" size={18} className="text-muted-foreground" />{_('My Classes')}
                </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profileData.assignedClasses.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="school_off" size={32} className="text-muted-foreground/40" />
                          <p className="text-body-md text-muted-foreground">{_('No classes assigned')}</p>
                        </div>
                      ) : (
                        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                          {profileData.assignedClasses.map((cls) => (
                            <motion.div key={cls.id} variants={cardStackReveal} custom={0} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon name="school" size={18} className="text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-title-sm font-medium">{cls.name}</p>
                                <p className="text-label-xs text-muted-foreground">{_('Grade')} {cls.grade} &middot; {cls.studentCount} {_('students')} &middot; {cls.subjectIds?.length} {_('subjects')}</p>
                              </div>
                              <Badge variant="secondary" className="text-label-xs">{cls.code}</Badge>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div variants={cardStackReveal} custom={0}>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-sm flex items-center gap-2">
                      <Icon name="info" size={18} className="text-muted-foreground" />{_('Account Information')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-md">
                      <div>
                        <p className="text-label-xs text-muted-foreground">{_('Email')}</p>
                        <p className="text-title-sm font-medium">{profileData.user.email ?? ''}</p>
                      </div>
                      <div>
                        <p className="text-label-xs text-muted-foreground">{_('Role')}</p>
                        <p className="text-title-sm font-medium capitalize">{profileData.user.role ?? 'teacher'}</p>
                      </div>
                      <div>
                        <p className="text-label-xs text-muted-foreground">{_('User ID')}</p>
                        <p className="text-title-sm font-medium">{profileData.user.id ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-label-xs text-muted-foreground">{_('Account Status')}</p>
                        <Badge variant="success" className="text-label-xs mt-0.5">{_('Active')}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
