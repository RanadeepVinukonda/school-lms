import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/components/gamification/LeaderboardTable';
import { useAuthStore } from '@/store/authStore';
import { gamificationService } from '@/services/gamificationService';
import { scrollReveal } from '@/lib/motion';

export default function StudentLeaderboardPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const classId = user?.classId;
  const [view, setView] = useState<'global' | 'class'>(classId ? 'class' : 'global');

  const { data: globalData, isLoading: globalLoading, error: globalError } = useQuery({
    queryKey: ['leaderboard-global'],
    enabled: view === 'global',
    queryFn: () => gamificationService.getLeaderboard(100),
  });

  const { data: classData, isLoading: classLoading, error: classError } = useQuery({
    queryKey: ['leaderboard-class', classId],
    enabled: view === 'class' && !!classId,
    queryFn: () => gamificationService.getClassLeaderboard(classId!),
  });

  const leaderboard = view === 'global' ? globalData : classData;
  const isLoading = view === 'global' ? globalLoading : classLoading;
  const error = view === 'global' ? globalError : classError;

  return (
    <>
      <SEOHead title={_('Leaderboard')} description={_('View the leaderboard rankings')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-8"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Leaderboard')}</h1>
              <p className="text-body-md text-muted-foreground">{_('See how you rank against others')}</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={view} onValueChange={(v) => setView(v as 'global' | 'class')}>
          <TabsList className="w-full overflow-x-auto inline-flex">
            <TabsTrigger value="class" disabled={!classId}>{_('My Class')}</TabsTrigger>
            <TabsTrigger value="global">{_('Global')}</TabsTrigger>
          </TabsList>
        </Tabs>
        {!classId && view === 'class' && (
          <p className="text-sm text-muted-foreground -mt-4">{_('You are not assigned to a class. Switch to Global to see rankings.')}</p>
        )}

        <DataFetchWrapper data={leaderboard} isLoading={isLoading} error={error as Error | null} loadingType="card">
          {(data) => <LeaderboardTable entries={data} currentUserId={userId} />}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
