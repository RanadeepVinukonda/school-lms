import { useState } from 'react';
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
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const classId = user?.classId;
  const [view, setView] = useState<'global' | 'class'>('class');

  const { data: globalData, isLoading: globalLoading } = useQuery({
    queryKey: ['leaderboard-global'],
    enabled: view === 'global',
    queryFn: () => gamificationService.getLeaderboard(100),
  });

  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['leaderboard-class', classId],
    enabled: view === 'class' && !!classId,
    queryFn: () => gamificationService.getClassLeaderboard(classId!),
  });

  const leaderboard = view === 'global' ? globalData : classData;
  const isLoading = view === 'global' ? globalLoading : classLoading;

  return (
    <>
      <SEOHead title="Leaderboard" description="View the leaderboard rankings" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-4xl mx-auto pb-32 space-y-8"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">Leaderboard</h1>
              <p className="text-body-md text-muted-foreground">See how you rank against others</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={view} onValueChange={(v) => setView(v as 'global' | 'class')}>
          <TabsList>
            <TabsTrigger value="class">My Class</TabsTrigger>
            <TabsTrigger value="global">Global</TabsTrigger>
          </TabsList>
        </Tabs>

        <DataFetchWrapper data={leaderboard} isLoading={isLoading} error={null} loadingType="card">
          {leaderboard && <LeaderboardTable entries={leaderboard} currentUserId={userId} />}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
