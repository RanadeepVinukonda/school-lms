import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { gamificationService } from '@/services/gamificationService';
import { cardStackReveal } from '@/lib/motion';
import type { Badge } from '@/types/gamification';

export default function TeacherRewardsPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['teacher-gamification-profile', user?.id],
    queryFn: () => gamificationService.getMyProfile(),
    enabled: !!user?.id,
  });

  const { data: badges, isLoading: badgesLoading, error: badgesError, refetch: refetchBadges } = useQuery({
    queryKey: ['teacher-badges', user?.id],
    queryFn: () => gamificationService.getMyBadges(),
    enabled: !!user?.id,
  });

  const isLoading = profileLoading || badgesLoading;
  const error = profileError || badgesError;

  if (isLoading) {
    return (
      <>
        <SEOHead title={_('My Rewards')} description={_('View your earned badges and achievements')} />
        <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-6">
          <LoadingSkeleton type="card" count={3} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={_('Failed to load rewards')}
        message={_('Could not fetch your achievements. Please try again.')}
        onRetry={() => { refetchProfile(); refetchBadges(); }}
      />
    );
  }

  const earnedBadges: Badge[] = (badges || []).filter((b: Badge) => b.earned);
  const allBadges: Badge[] = badges || [];

  return (
    <>
      <SEOHead title={_('My Rewards')} description={_('View your earned badges and achievements')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-6"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-md font-bold">{_('My Rewards')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">{_('Your achievements and earned badges')}</p>
        </motion.div>

        {profile && (
          <motion.div variants={cardStackReveal} custom={1}>
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon name="military_tech" size={32} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-label-sm text-muted-foreground">{_('Level')}</p>
                      <p className="text-headline-sm font-bold">{profile.level || 1}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
                      <Icon name="bolt" size={32} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-label-sm text-muted-foreground">{_('XP')}</p>
                      <p className="text-headline-sm font-bold">{profile.xp?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                      <Icon name="whatshot" size={32} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-label-sm text-muted-foreground">{_('Streak')}</p>
                      <p className="text-headline-sm font-bold">{profile.streak || 0} {_('days')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center">
                      <Icon name="stars" size={32} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-label-sm text-muted-foreground">{_('Badges')}</p>
                      <p className="text-headline-sm font-bold">{earnedBadges.length} / {allBadges.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={cardStackReveal} custom={2}>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-title-sm flex items-center gap-2">
                <Icon name="verified" size={20} className="text-primary" />
                {_('Earned Badges')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earnedBadges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="emoji_events" size={48} className="mx-auto mb-3 text-muted-foreground/30" />
                  <p>{_('No badges earned yet')}</p>
                  <p className="text-label-sm mt-1">{_('Complete activities to earn badges')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {earnedBadges.map((badge: Badge) => (
                    <div
                      key={badge.id}
                      className="p-4 rounded-xl border border-border/60 bg-surface hover:shadow-md hover:border-primary/30 transition-all text-center"
                    >
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Icon name={badge.icon || 'badge'} size={32} className="text-primary" />
                      </div>
                      <p className="text-sm font-semibold">{badge.name}</p>
                      <p className="text-label-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
                      {badge.earnedAt && (
                        <p className="text-[10px] text-muted-foreground/60 mt-2">
                          {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
