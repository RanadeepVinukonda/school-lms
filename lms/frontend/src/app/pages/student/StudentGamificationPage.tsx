import { useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { XPBar } from '@/components/gamification/XPBar';
import { BadgeCard } from '@/components/gamification/BadgeCard';
import { DailyChallengeCard } from '@/components/gamification/DailyChallengeCard';
import { useAuthStore } from '@/store/authStore';
import { gamificationService } from '@/services/gamificationService';
import { XP_THRESHOLDS } from '@/components/gamification/constants';
import { scrollReveal, staggerContainer } from '@/lib/motion';

export default function StudentGamificationPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['gamification-profile', userId],
    enabled: !!userId,
    queryFn: () => gamificationService.getMyProfile(),
  });

  const { data: badges, isLoading: badgesLoading, error: badgesError } = useQuery({
    queryKey: ['gamification-badges', userId],
    enabled: !!userId,
    queryFn: () => gamificationService.getMyBadges(),
  });

  const { data: challenges, isLoading: challengesLoading, error: challengesError } = useQuery({
    queryKey: ['gamification-daily-challenges', userId],
    enabled: !!userId,
    queryFn: () => gamificationService.getDailyChallenges(),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => gamificationService.completeDailyChallenge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-daily-challenges', userId] });
      queryClient.invalidateQueries({ queryKey: ['gamification-profile', userId] });
    },
  });

  const handleComplete = useCallback((id: string) => {
    completeMutation.mutate(id);
  }, [completeMutation]);

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpForCurrentLevel = level > 1 ? (XP_THRESHOLDS[level - 1] ?? 0) : 0;
  const xpForNextLevel = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + 1000;

  return (
    <>
      <SEOHead title={_('Rewards')} description={_('Your gamification rewards')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Rewards')}</h1>
              <p className="text-body-md text-muted-foreground">{_('Track your XP, badges, and daily challenges')}</p>
            </div>
          </div>
        </motion.div>

        <DataFetchWrapper data={profile} isLoading={profileLoading} error={profileError as Error | null} loadingType="card">
          {(p) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card variant="filled" className="bg-primary/5 border-primary/20 relative">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardContent className="flex items-center gap-4 p-6 cursor-help">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon name="stars" size={28} />
                        </div>
                        <div>
                          <p className="text-label-sm text-muted-foreground">{_('Level')}</p>
                          <p className="text-headline-sm font-bold">{p.level}</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">{_('How to Level Up')}</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>{_('Complete quizzes & exams for +15 XP each')}</li>
                        <li>{_('High accuracy (≥80%) earns bonus +50 XP')}</li>
                        <li>{_('Perfect scores earn bonus +100 XP')}</li>
                        <li>{_('Complete daily challenges for XP')}</li>
                        <li>{_('Maintain streaks for bonus XP every 3 days')}</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>{_('Updates:')}</strong> {_('Immediately after submitting a quiz, exam, or daily challenge')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
              <Card variant="filled" className="bg-amber-500/5 border-amber-500/20 relative">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardContent className="flex items-center gap-4 p-6 cursor-help">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                          <Icon name="monetization_on" size={28} />
                        </div>
                        <div>
                          <p className="text-label-sm text-muted-foreground">{_('Coins')}</p>
                          <p className="text-headline-sm font-bold">{p.coins}</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">{_('How to Earn Coins')}</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>{_('Complete quizzes & exams for +3 coins each')}</li>
                        <li>{_('High accuracy (≥80%) earns +10 coins')}</li>
                        <li>{_('Perfect scores earn +25 coins')}</li>
                        <li>{_('Complete daily challenges for coins')}</li>
                        <li>{_('Maintain streaks for bonus coins every 3 days')}</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>{_('Updates:')}</strong> {_('Immediately after submitting a quiz, exam, or daily challenge')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
              <Card variant="filled" className="bg-green-500/5 border-green-500/20 relative">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardContent className="flex items-center gap-4 p-6 cursor-help">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                          <Icon name="local_fire_department" size={28} />
                        </div>
                        <div>
                          <p className="text-label-sm text-muted-foreground">{_('Streak')}</p>
                          <p className="text-headline-sm font-bold">{p.streak} days</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">{_('How Streak Works')}</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>{_('Open the app daily to keep your streak alive')}</li>
                        <li>{_('Every 3 days you earn bonus XP & coins')}</li>
                        <li>{_('Missing a day resets your streak to 0')}</li>
                        <li>{_('Complete activities to stay active')}</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>{_('Updates:')}</strong> {_('Automatically each day when you open the app or submit work')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
              <Card variant="filled" className="bg-purple-500/5 border-purple-500/20 relative">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardContent className="flex items-center gap-4 p-6 cursor-help">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
                          <Icon name="workspace_premium" size={28} />
                        </div>
                        <div>
                          <p className="text-label-sm text-muted-foreground">{_('Badges')}</p>
                          <p className="text-headline-sm font-bold">{p.badges?.length ?? 0}</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">{_('How to Earn Badges')}</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>{_('Complete your first lesson — First Steps')}</li>
                        <li>{_('Complete 5 high-accuracy assessments — High Achiever')}</li>
                        <li>{_('Score 3 perfect scores — Perfect Score')}</li>
                        <li>{_('Reach streaks of 3, 7, and 30 days')}</li>
                        <li>{_('Each level you reach unlocks a new badge (Newcomer → Top Performer)')}</li>
                        <li>{_('Collect 100 coins — Coin Collector')}</li>
                        <li>{_('Earn 1000 or 5000 total XP')}</li>
                        <li>{_('Complete 10 daily challenges')}</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>{_('Updates:')}</strong> {_('Checked automatically after each quiz, exam, or challenge completion')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
            </div>
          )}
        </DataFetchWrapper>

        {profile && <XPBar xp={xp} level={level} xpForCurrentLevel={xpForCurrentLevel} xpForNextLevel={xpForNextLevel} />}

        <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-title-md font-bold tracking-tight">{_('Daily Challenges')}</h2>
              <p className="text-body-sm text-muted-foreground">{_('Complete these to earn bonus XP and coins')}</p>
            </div>
            <DataFetchWrapper data={challenges} isLoading={challengesLoading} error={challengesError} loadingType="card">
              {(cData) => cData && cData.length > 0 ? (
                <div className="space-y-3">
                  {cData.map((c, i) => (
                    <DailyChallengeCard key={c.id} challenge={c} onComplete={handleComplete} completing={completeMutation.isPending} index={i} />
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground">{_('No challenges for today')}</p>
              )}
            </DataFetchWrapper>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-title-md font-bold tracking-tight">{_('Badges')}</h2>
              <p className="text-body-sm text-muted-foreground">{_('Badges you have earned')}</p>
            </div>
            <DataFetchWrapper data={badges} isLoading={badgesLoading} error={badgesError} loadingType="card">
              {(bData) => {
                const earnedBadges = bData?.filter((b) => b.earned) ?? [];
                if (earnedBadges.length === 0) {
                  return (
                    <div className="flex flex-col items-center py-10 px-4 text-center rounded-xl border border-dashed border-muted-foreground/30">
                      <Icon name="workspace_premium" size={40} className="text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium">{_('No badges earned yet')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{_('Complete lessons and challenges to start earning badges')}</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {earnedBadges.map((b, i) => (
                      <BadgeCard key={b.id} badge={b} earned earnedAt={b.earnedAt} index={i} />
                    ))}
                  </div>
                );
              }}
            </DataFetchWrapper>
          </div>
        </div>
      </motion.div>
    </>
  );
}
