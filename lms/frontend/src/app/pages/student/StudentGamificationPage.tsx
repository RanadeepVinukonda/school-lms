import { useCallback } from 'react';
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
      <SEOHead title="Rewards" description="Your gamification rewards" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32 space-y-8"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">Rewards</h1>
              <p className="text-body-md text-muted-foreground">Track your XP, badges, and daily challenges</p>
            </div>
          </div>
        </motion.div>

        <DataFetchWrapper data={profile} isLoading={profileLoading} error={profileError as Error | null} loadingType="card">
          {(p) => (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card variant="filled" className="bg-primary/5 border-primary/20 relative">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardContent className="flex items-center gap-4 p-6 cursor-help">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon name="stars" size={28} />
                        </div>
                        <div>
                          <p className="text-label-sm text-muted-foreground">Level</p>
                          <p className="text-headline-sm font-bold">{p.level}</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">How to Level Up</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>Complete quizzes &amp; exams for +15 XP each</li>
                        <li>High accuracy (&ge;80%) earns bonus +50 XP</li>
                        <li>Perfect scores earn bonus +100 XP</li>
                        <li>Complete daily challenges for XP</li>
                        <li>Maintain streaks for bonus XP every 3 days</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>Updates:</strong> Immediately after submitting a quiz, exam, or daily challenge</p>
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
                          <p className="text-label-sm text-muted-foreground">Coins</p>
                          <p className="text-headline-sm font-bold">{p.coins}</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">How to Earn Coins</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>Complete quizzes &amp; exams for +3 coins each</li>
                        <li>High accuracy (&ge;80%) earns +10 coins</li>
                        <li>Perfect scores earn +25 coins</li>
                        <li>Complete daily challenges for coins</li>
                        <li>Maintain streaks for bonus coins every 3 days</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>Updates:</strong> Immediately after submitting a quiz, exam, or daily challenge</p>
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
                          <p className="text-label-sm text-muted-foreground">Streak</p>
                          <p className="text-headline-sm font-bold">{p.streak} days</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">How Streak Works</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>Open the app daily to keep your streak alive</li>
                        <li>Every 3 days you earn bonus XP &amp; coins</li>
                        <li>Missing a day resets your streak to 0</li>
                        <li>Complete activities to stay active</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>Updates:</strong> Automatically each day when you open the app or submit work</p>
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
                          <p className="text-label-sm text-muted-foreground">Badges</p>
                          <p className="text-headline-sm font-bold">{p.badges?.length ?? 0}</p>
                        </div>
                      </CardContent>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-64">
                      <p className="text-body-sm font-medium mb-1">How to Earn Badges</p>
                      <ul className="text-label-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        <li>Complete your first lesson &mdash; <em>First Steps</em></li>
                        <li>Complete 5 high-accuracy assessments &mdash; <em>High Achiever</em></li>
                        <li>Score 3 perfect scores &mdash; <em>Perfect Score</em></li>
                        <li>Reach streaks of 3, 7, and 30 days</li>
                        <li>Reach levels 5 and 10</li>
                        <li>Collect 100 coins &mdash; <em>Coin Collector</em></li>
                        <li>Earn 1000 or 5000 total XP</li>
                        <li>Complete 10 daily challenges</li>
                      </ul>
                      <p className="text-label-xs text-muted-foreground mt-2 pt-2 border-t border-border"><strong>Updates:</strong> Checked automatically after each quiz, exam, or challenge completion</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
            </div>
          )}
        </DataFetchWrapper>

        {profile && <XPBar xp={xp} level={level} xpForCurrentLevel={xpForCurrentLevel} xpForNextLevel={xpForNextLevel} />}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h2 className="text-title-md font-bold tracking-tight">Daily Challenges</h2>
              <p className="text-body-sm text-muted-foreground">Complete these to earn bonus XP and coins</p>
            </div>
            <DataFetchWrapper data={challenges} isLoading={challengesLoading} error={challengesError} loadingType="card">
              {(cData) => cData && cData.length > 0 ? (
                <div className="space-y-3">
                  {cData.map((c, i) => (
                    <DailyChallengeCard key={c.id} challenge={c} onComplete={handleComplete} completing={completeMutation.isPending} index={i} />
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-muted-foreground">No challenges for today</p>
              )}
            </DataFetchWrapper>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-title-md font-bold tracking-tight">Badges</h2>
              <p className="text-body-sm text-muted-foreground">Your earned and locked achievements</p>
            </div>
            <DataFetchWrapper data={badges} isLoading={badgesLoading} error={badgesError} loadingType="card">
              {(bData) => (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bData?.map((b, i) => (
                    <BadgeCard key={b.id} badge={b} earned={b.earned} earnedAt={b.earnedAt} index={i} />
                  ))}
                </div>
              )}
            </DataFetchWrapper>
          </div>
        </div>
      </motion.div>
    </>
  );
}
