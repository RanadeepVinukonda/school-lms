import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { staggerContainer, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { getUser, getUserByRole } from '@/services/dataService';
import { getChildren } from '@/services/parentService';
import { ROUTES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import ProfileHeader from '@/components/profile/ProfileHeader';

interface ProfileData {
  user: import('@/services/dataService').UserDoc;
  linkedChildrenCount: number;
  childrenList: Array<{ id: string; displayName: string }>;
}

export default function ParentProfilePage() {
  const { _ } = useTranslation();
  const authUser = useAuthStore((s) => s.user);

  const { data: raw, isLoading, error, refetch } = useQuery({
    queryKey: ['parent-profile', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) throw new Error('Not authenticated');
      const [firestoreUser, childrenRes] = await Promise.all([
        getUser(authUser.id),
        getChildren().catch(() => []),
      ]);
      if (!firestoreUser) throw new Error('User not found in Firestore');
      return { firestoreUser, children: childrenRes };
    },
    enabled: !!authUser,
  });

  const data: ProfileData = useMemo(() => {
    if (!raw) {
      return { user: null!, linkedChildrenCount: 0, childrenList: [] };
    }
    const { firestoreUser, children } = raw;
    return {
      user: firestoreUser,
      linkedChildrenCount: children?.length ?? 0,
      childrenList: (children ?? []).map((c: any) => ({ id: c.id, displayName: c.displayName ?? 'Child' })),
    };
  }, [raw, authUser]);

  const statCards = [
    { icon: 'group', label: 'Linked Children', value: data.linkedChildrenCount, bg: 'bg-primary-container', color: 'text-on-primary-container' },
    { icon: 'analytics', label: 'Reports Available', value: data.linkedChildrenCount > 0 ? 'Yes' : 'No', bg: 'bg-secondary-container', color: 'text-on-secondary-container' },
  ];

  return (
    <>
      <SEOHead title="My Profile" description="Parent profile and account information" canonical="/parent/profile" />
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
                <ProfileHeader
                  user={profileData.user}
                  roleLabel="Parent"
                  subtitle={profileData.linkedChildrenCount > 0 ? `${profileData.linkedChildrenCount} ${profileData.linkedChildrenCount === 1 ? _('Linked Child') : _('Linked Children')}` : undefined}
                  editHref={ROUTES.PARENT_PROFILE_EDIT}
                />
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {statCards.map((stat) => (
                    <Card key={stat.label} className="border-border/60">
                      <CardContent className="p-5 flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                          <Icon name={stat.icon} size={20} className={stat.color} />
                        </div>
                        <div>
                          <p className="text-display-xs font-bold tabular-nums">{stat.value}</p>
                          <p className="text-label-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>

              {profileData.childrenList.length > 0 && (
                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-sm flex items-center gap-2 flex-wrap">
                        <Icon name="group" size={18} className="text-muted-foreground" />Linked Children
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                        {profileData.childrenList.map((child) => (
                          <motion.div key={child.id} variants={cardStackReveal} custom={0} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon name="person" size={18} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-title-sm font-medium">{child.displayName}</p>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <motion.div variants={cardStackReveal} custom={0}>
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                      <CardTitle className="text-title-sm flex items-center gap-2 flex-wrap">
                        <Icon name="info" size={18} className="text-muted-foreground" />Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-md">
                      <div>
                        <p className="text-label-xs text-muted-foreground">Email</p>
                        <p className="text-title-sm font-medium">{profileData.user.email ?? ''}</p>
                      </div>
                      <div>
                        <p className="text-label-xs text-muted-foreground">Role</p>
                        <p className="text-title-sm font-medium capitalize">{profileData.user.role ?? 'parent'}</p>
                      </div>
                      <div>
                        <p className="text-label-xs text-muted-foreground">Account Status</p>
                        <Badge variant="success" className="text-label-xs mt-0.5">Active</Badge>
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
