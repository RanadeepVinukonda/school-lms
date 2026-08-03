import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/lib/constants';
import { cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { getAllSubjects, getAllClasses, getUser } from '@/services/dataService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import type { Subject, ClassEntry } from '@/services/dataService';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';

interface ProfileData {
  user: import('@/services/dataService').UserDoc;
  assignedClasses: ClassEntry[];
  taughtSubjects: Subject[];
}

export default function TeacherProfilePage() {
  const { _ } = useTranslation();
  const authUser = useAuthStore((s) => s.user);

  const { data: raw, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-profile', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) throw new Error('Not authenticated');
      const [firestoreUser, subjects, classes, assignmentsRes] = await Promise.all([
        getUser(authUser.id),
        getAllSubjects(),
        getAllClasses(),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
      ]);
      if (!firestoreUser) throw new Error('User not found in Firestore');
      return { firestoreUser, subjects, classes, assignments: assignmentsRes?.data ?? [] };
    },
    enabled: !!authUser,
  });

  const data: ProfileData = useMemo(() => {
    if (!raw) {
      return { assignedClasses: [], taughtSubjects: [], user: null! };
    }
    const { firestoreUser, subjects, classes, assignments } = raw;
    const myClassIds = [...new Set(assignments.map((a) => a.classId))];
    const mySubjectIds = [...new Set(assignments.map((a) => a.subjectId))];

    return {
      user: firestoreUser,
      assignedClasses: classes.filter((c) => myClassIds.includes(c.id)),
      taughtSubjects: subjects.filter((s) => mySubjectIds.includes(s.id)),
    };
  }, [raw, authUser]);

  return (
    <>
      <SEOHead title={_('My Profile')} description={_('Teacher profile')} canonical="/teacher/profile" />
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
                <ProfileHeader user={profileData.user} roleLabel={_('Teacher')} editHref={ROUTES.TEACHER_PROFILE_EDIT} />
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-sm flex items-center gap-2">
                      <Icon name="group" size={18} className="text-muted-foreground" />{_('My Classes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {profileData.assignedClasses.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <Icon name="school_off" size={32} className="text-muted-foreground/40" />
                        <p className="text-body-md text-muted-foreground">{_('No classes assigned')}</p>
                      </div>
                    ) : (
                      profileData.assignedClasses.map((cls) => {
                        const classSubjects = (cls.subjectIds || [])
                          .map((id) => profileData.taughtSubjects.find((s) => s.id === id))
                          .filter((s): s is Subject => !!s);
                        return (
                          <div key={cls.id} className="p-4 rounded-xl border border-border/60">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Icon name="school" size={18} className="text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-title-sm font-medium">{cls.name}</p>
                                <p className="text-label-xs text-muted-foreground">{_('Grade')} {cls.grade}</p>
                              </div>
                              <Badge variant="secondary" className="text-label-xs">{cls.code}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {classSubjects.map((s) => (
                                <Badge key={s.id} variant="outline" className="text-label-xs gap-1">
                                  <Icon name={s.icon ?? 'menu_book'} size={11} />{s.name}
                                </Badge>
                              ))}
                              {classSubjects.length === 0 && (
                                <span className="text-label-xs text-muted-foreground">{_('No subjects assigned')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                <ProfileDetails user={profileData.user} />
              </motion.div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
