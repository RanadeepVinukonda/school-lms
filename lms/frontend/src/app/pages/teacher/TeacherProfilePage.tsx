import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { Link } from 'react-router-dom';
import { getInitials } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { mockUsers, mockClasses, mockSubjects, mockEnrollments, mockGrades } from '@/lib/mockData';

const CURRENT_TEACHER = mockUsers.teacher1;

interface ProfileData {
  stats: {
    totalStudents: number;
    totalClasses: number;
    totalSubjects: number;
    avgPerformance: number;
  };
  assignedClasses: typeof mockClasses;
  taughtSubjects: typeof mockSubjects;
}

export default function TeacherProfilePage() {
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const data = useMemo((): ProfileData => {
    const enrolledStudentIds = [...new Set(mockEnrollments.map((e) => e.studentId))];
    const allGrades = mockGrades.filter((g) => mockSubjects.some((s) => s.id === g.subjectId));
    const avgPerformance =
      allGrades.length > 0
        ? Math.round(allGrades.reduce((sum, g) => sum + g.percentage, 0) / allGrades.length)
        : 0;

    return {
      stats: {
        totalStudents: enrolledStudentIds.length,
        totalClasses: mockClasses.filter((c) => c.classTeacherId === CURRENT_TEACHER.id).length,
        totalSubjects: mockSubjects.length,
        avgPerformance,
      },
      assignedClasses: mockClasses.filter((c) => c.classTeacherId === CURRENT_TEACHER.id),
      taughtSubjects: mockSubjects,
    };
  }, []);

  const statCards = [
    { icon: 'group', label: 'Students', value: data.stats.totalStudents, bg: 'bg-primary-container', color: 'text-on-primary-container' },
    { icon: 'school', label: 'Classes', value: data.stats.totalClasses, bg: 'bg-secondary-container', color: 'text-on-secondary-container' },
    { icon: 'menu_book', label: 'Subjects', value: data.stats.totalSubjects, bg: 'bg-success-container', color: 'text-on-success-container' },
  ];

  const avgPct = data.stats.avgPerformance;
  const avgStat = {
    icon: 'graded',
    label: 'Avg Performance',
    value: `${avgPct}%`,
    bg: avgPct >= 80 ? 'bg-success-container' : avgPct >= 60 ? 'bg-warning-container' : 'bg-error-container',
    color: avgPct >= 80 ? 'text-on-success-container' : avgPct >= 60 ? 'text-on-warning-container' : 'text-on-error-container',
  };

  return (
    <>
      <SEOHead title="My Profile" description="Teacher profile and statistics" canonical="/teacher/profile" />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-4xl mx-auto space-y-6 pb-20"
      >
        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          loadingType="profile"
        >
          {(profileData) => (
            <>
              <motion.div variants={listItem}>
                <Card variant="elevated" className="overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                  <CardContent className="p-6 -mt-12">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                      <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/20">
                        <AvatarFallback className="text-2xl">
                          {getInitials(CURRENT_TEACHER.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-headline-sm">{CURRENT_TEACHER.displayName}</h1>
                        <p className="text-muted-foreground">{CURRENT_TEACHER.email}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                          <Badge variant="info" className="text-[10px]">
                            <Icon name="school" size={11} className="mr-1" />
                            Teacher
                          </Badge>
                          {CURRENT_TEACHER.teacherId && (
                            <Badge variant="secondary" className="text-[10px]">
                              {CURRENT_TEACHER.teacherId}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link to={ROUTES.TEACHER_PROFILE_EDIT}><Icon name="edit" size={15} />Edit Profile</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={listItem}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...statCards, avgStat].map((stat) => (
                    <Card key={stat.label}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                          <Icon name={stat.icon} size={20} className={stat.color} />
                        </div>
                        <div>
                          <p className="text-xl font-bold tabular-nums">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="menu_book" size={18} className="text-muted-foreground" />
                        Subjects Taught
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profileData.taughtSubjects.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="book_off" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No subjects assigned</p>
                        </div>
                      ) : (
                        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                          {profileData.taughtSubjects.map((sub) => (
                            <motion.div
                              key={sub.id}
                              variants={listItem}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${sub.color}15` }}>
                                <span style={{ color: sub.color }}>
                                  <Icon name={sub.icon} size={18} />
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{sub.name}</p>
                                <p className="text-xs text-muted-foreground">{sub.code} &middot; {sub.category}</p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{sub.code}</Badge>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="school" size={18} className="text-muted-foreground" />
                        Classes Assigned
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profileData.assignedClasses.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="school_off" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No classes assigned</p>
                        </div>
                      ) : (
                        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                          {profileData.assignedClasses.map((cls) => (
                            <motion.div
                              key={cls.id}
                              variants={listItem}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon name="school" size={18} className="text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{cls.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Grade {cls.grade} &middot; {cls.studentCount} students &middot; {cls.subjectIds.length} subjects
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{cls.code}</Badge>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div variants={listItem}>
                <Card variant="elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-md flex items-center gap-2">
                      <Icon name="info" size={18} className="text-muted-foreground" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{CURRENT_TEACHER.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Role</p>
                        <p className="font-medium capitalize">{CURRENT_TEACHER.role}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Teacher ID</p>
                        <p className="font-medium">{CURRENT_TEACHER.teacherId ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Account Status</p>
                        <Badge variant="success" className="text-[10px] mt-0.5">Active</Badge>
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
