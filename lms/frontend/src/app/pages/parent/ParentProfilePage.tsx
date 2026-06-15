import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { getInitials } from '@/lib/utils';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { getUser, getUserByRole } from '@/services/dataService';
import { getChildren } from '@/services/parentService';

interface ProfileData {
  user: import('@/services/dataService').UserDoc;
  linkedChildrenCount: number;
  childrenList: Array<{ id: string; displayName: string }>;
}

export default function ParentProfilePage() {
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
        className="p-6 max-w-4xl mx-auto pb-32 space-y-16"
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
                        <AvatarFallback className="text-2xl">{getInitials(profileData.user.displayName ?? 'P')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-headline-sm">{profileData.user.displayName ?? 'Parent'}</h1>
                        <p className="text-body-md text-muted-foreground">{profileData.user.email ?? ''}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                          <Badge variant="info" className="text-label-xs">
                            <Icon name="family_history" size={11} className="mr-1" />Parent
                          </Badge>
                          {profileData.user.id && (
                            <Badge variant="secondary" className="text-label-xs">{profileData.user.id}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                      <CardTitle className="text-title-sm flex items-center gap-2">
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
                              <p className="text-label-xs text-muted-foreground">ID: {child.id}</p>
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
                    <CardTitle className="text-title-sm flex items-center gap-2">
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
                        <p className="text-label-xs text-muted-foreground">User ID</p>
                        <p className="text-title-sm font-medium">{profileData.user.id ?? 'N/A'}</p>
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
