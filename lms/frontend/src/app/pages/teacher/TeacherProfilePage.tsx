import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { cn, getInitials } from '@/lib/utils';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import {
  mockUsers,
  mockClasses,
  mockSubjects,
  mockEnrollments,
  mockGrades,
} from '@/lib/mockData';

const CURRENT_TEACHER = mockUsers.teacher1;

function ProfileSkeletonLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="error" size={28} className="text-destructive" />
        </div>
        <p className="text-lg font-semibold">Failed to load profile</p>
        <p className="text-sm text-muted-foreground">
          Please check your connection and try again
        </p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TeacherProfilePage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const stats = useMemo(() => {
    const enrolledStudentIds = [
      ...new Set(mockEnrollments.map((e) => e.studentId)),
    ];

    const allGrades = mockGrades.filter((g) =>
      mockSubjects.some((s) => s.id === g.subjectId),
    );
    const avgPerformance =
      allGrades.length > 0
        ? Math.round(
            allGrades.reduce((sum, g) => sum + g.percentage, 0) /
              allGrades.length,
          )
        : 0;

    return {
      totalStudents: enrolledStudentIds.length,
      totalClasses: mockClasses.filter(
        (c) => c.classTeacherId === CURRENT_TEACHER.id,
      ).length,
      totalSubjects: mockSubjects.length,
      avgPerformance,
    };
  }, []);

  const assignedClasses = useMemo(
    () => mockClasses.filter((c) => c.classTeacherId === CURRENT_TEACHER.id),
    [],
  );

  const taughtSubjects = useMemo(() => mockSubjects, []);

  if (isLoading) return <ProfileSkeletonLoader />;

  if (isError) return <ErrorDisplay onRetry={() => refetch()} />;

  return (
    <>
      <SEOHead
        title="My Profile"
        description="Teacher profile and statistics"
        canonical="/teacher/profile"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-4xl mx-auto space-y-6 pb-20"
      >
        {/* Profile Card */}
        <motion.div variants={listItem}>
          <Card className="overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            <CardContent className="p-6 -mt-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/20">
                  <AvatarFallback className="text-2xl">
                    {getInitials(CURRENT_TEACHER.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-bold">
                    {CURRENT_TEACHER.displayName}
                  </h1>
                  <p className="text-muted-foreground">
                    {CURRENT_TEACHER.email}
                  </p>
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
                <Button variant="outline" size="sm" className="gap-1">
                  <Icon name="edit" size={15} />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={listItem}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon name="group" size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.totalStudents}
                  </p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Icon name="school" size={20} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.totalClasses}
                  </p>
                  <p className="text-xs text-muted-foreground">Classes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Icon name="menu_book" size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.totalSubjects}
                  </p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    stats.avgPerformance >= 80
                      ? 'bg-emerald-500/10'
                      : stats.avgPerformance >= 60
                        ? 'bg-amber-500/10'
                        : 'bg-destructive/10',
                  )}
                >
                  <Icon
                    name="graded"
                    size={20}
                    className={
                      stats.avgPerformance >= 80
                        ? 'text-emerald-600'
                        : stats.avgPerformance >= 60
                          ? 'text-amber-600'
                          : 'text-destructive'
                    }
                  />
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">
                    {stats.avgPerformance}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avg Performance
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subjects Taught */}
          <motion.div variants={listItem}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="menu_book" size={18} className="text-muted-foreground" />
                  Subjects Taught
                </CardTitle>
              </CardHeader>
              <CardContent>
                {taughtSubjects.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Icon
                      name="book_off"
                      size={32}
                      className="text-muted-foreground/40"
                    />
                    <p className="text-sm text-muted-foreground">
                      No subjects assigned
                    </p>
                  </div>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                    {taughtSubjects.map((sub) => (
                      <motion.div
                        key={sub.id}
                        variants={listItem}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: `${sub.color}15`,
                          }}
                        >
                          <span style={{ color: sub.color }}>
                            <Icon name={sub.icon} size={18} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sub.code} &middot; {sub.category}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {sub.code}
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Assigned Classes */}
          <motion.div variants={listItem}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="school" size={18} className="text-muted-foreground" />
                  Classes Assigned
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedClasses.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Icon
                      name="school_off"
                      size={32}
                      className="text-muted-foreground/40"
                    />
                    <p className="text-sm text-muted-foreground">
                      No classes assigned
                    </p>
                  </div>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                    {assignedClasses.map((cls) => (
                      <motion.div
                        key={cls.id}
                        variants={listItem}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon
                            name="school"
                            size={18}
                            className="text-primary"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Grade {cls.grade} &middot; {cls.studentCount}{' '}
                            students &middot; {cls.subjectIds.length} subjects
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {cls.code}
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Additional Info */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
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
                  <p className="font-medium capitalize">
                    {CURRENT_TEACHER.role}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teacher ID</p>
                  <p className="font-medium">
                    {CURRENT_TEACHER.teacherId ?? 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Account Status</p>
                  <Badge variant="success" className="text-[10px] mt-0.5">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
