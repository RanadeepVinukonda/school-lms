import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import { getAllSubjects, getGradesByStudent, getUser, getClass } from '@/services/dataService';
import { useTranslation } from '@/hooks/useTranslation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';
import ProfilePreferences from '@/components/profile/ProfilePreferences';

export default function StudentProfilePage() {
  const { _ } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-profile', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) throw new Error('User not found');
      const firestoreUser = await getUser(authUser.id);
      if (!firestoreUser) throw new Error('User not found in Firestore');
      const user = firestoreUser as typeof firestoreUser & { studentId?: string; classId?: string };
      const authId = user.id;
      const [allSubjects, grades, classDoc] = await Promise.all([
        getAllSubjects(),
        getGradesByStudent(authId),
        user.classId ? getClass(user.classId) : Promise.resolve(null),
      ]);

      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      const studentSubjects = (classDoc?.subjectIds || [])
        .map((subId) => {
          const s = subjectMap.get(subId);
          if (!s) return null;
          return { ...s, icon: s.icon || 'school', color: s.color || 'hsl(var(--accent-default))' };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      const enrichedGrades = grades
        .map((g) => ({ ...g, subject: g.subjectId ? (subjectMap.get(g.subjectId)?.name ?? 'Unknown') : 'Unknown' }));
      const avgPercentage = enrichedGrades.length > 0
        ? enrichedGrades.reduce((sum, g) => sum + g.percentage, 0) / enrichedGrades.length
        : 0;

      return { user, subjects: studentSubjects, grades: enrichedGrades, avgPercentage, totalSubjects: studentSubjects.length, className: classDoc?.name ?? null, classGrade: classDoc?.grade ?? null };
    },
    enabled: !!authUser,
  });

  useRealtimeInvalidation([{ table: 'profiles', queryKey: ['student-profile', authUser?.id ?? ''] }]);

  return (
    <>
      <SEOHead title={_('My Profile')} description={_('Your student profile and academic summary')} />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <div>
          <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('My Profile')}</h1>
        </div>
        <DataFetchWrapper data={data} isLoading={isLoading} error={isError ? error ?? new Error(_('Failed to load profile')) : null} loadingType="profile" emptyMessage={_('Could not load profile information')} onRetry={() => refetch()} errorTitle={_('Failed to load profile')}>
          {(d) => (
            <div className="space-y-16">
              {/* School + User Header */}
              <div>
                <ProfileHeader
                  user={d.user}
                  roleLabel={_('Student')}
                  subtitle={d.user.studentId ? `${_('Roll No')}: ${d.user.studentId}` : undefined}
                  badges={d.className ? <Badge variant="info" className="text-xs gap-1"><Icon name="school" size={12} />{d.className}{d.classGrade ? ` (${_('Grade')} ${d.classGrade})` : ''}</Badge> : undefined}
                  editHref="/student/profile/edit"
                />
              </div>

              {/* Academic Overview */}
              <div>
                <div




                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <div>
                    <Card className="p-5 flex items-center gap-4 border-border/60">
                      <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><Icon name="school" size={20} className="text-primary" /></div>
                      <div><p className="text-label-xs text-muted-foreground">{_('Subjects')}</p><p className="text-display-xs font-bold">{d.totalSubjects}</p></div>
                    </Card>
                  </div>
                  <div>
                    <Card className="p-5 flex items-center gap-4 border-border/60">
                      <div className="h-12 w-12 rounded-xl bg-success-container flex items-center justify-center shrink-0"><Icon name="grade" size={20} className="text-success" /></div>
                      <div><p className="text-label-xs text-muted-foreground">{_('Avg Grade')}</p><p className="text-display-xs font-bold">{d.avgPercentage.toFixed(0)}%</p></div>
                    </Card>
                  </div>
                  <div>
                    <Card className="p-5 flex items-center gap-4 border-border/60">
                      <div className="h-12 w-12 rounded-xl bg-warning-container flex items-center justify-center shrink-0"><Icon name="assignment" size={20} className="text-warning" /></div>
                      <div><p className="text-label-xs text-muted-foreground">{_('Completed')}</p><p className="text-display-xs font-bold">{d.grades.length}</p></div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div>
                <ProfileDetails user={d.user} includeDob />
              </div>

              {/* Preferences */}
              <div>
                <ProfilePreferences />
              </div>
            </div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
