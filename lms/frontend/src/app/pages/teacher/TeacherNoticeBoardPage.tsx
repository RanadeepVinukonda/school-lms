import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { noticeService } from '@/services/noticeService';

export default function TeacherNoticeBoardPage() {
  const { _ } = useTranslation();

  function priorityBadge(p: string) {
    switch (p) {
      case 'high': return <Badge variant="destructive">{_('High')}</Badge>;
      case 'medium': return <Badge variant="warning">{_('Medium')}</Badge>;
      case 'low': return <Badge variant="info">{_('Low')}</Badge>;
      default: return <Badge variant="secondary">{p}</Badge>;
    }
  }
  const { data: noticesRes, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-notices'],
    queryFn: () => noticeService.getNotices(),
  });

  const notices = (noticesRes as any)?.data as any[] | undefined;

  return (
    <>
      <SEOHead title={_('Notice Board')} description={_('View school notices and announcements')} />
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('Notice Board')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">{_('View school notices and announcements')}</p>
        </motion.div>

        <DataFetchWrapper
          data={notices}
          isLoading={isLoading}
          error={error ? new Error(_('Failed to load notices')) : null}
          onRetry={refetch}
          loadingType="card"
          emptyMessage={_('No notices posted yet')}
        >
          {() => (
            <div className="space-y-3">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-title-sm flex items-center gap-2">
                    <Icon name="campaign" size={18} />
                    {_('All Notices')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(notices as any[])?.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-muted-foreground">
                      <Icon name="campaign" size={48} className="text-muted-foreground/30 mb-3" />
                      <p className="text-title-sm font-semibold">{_('No notices posted yet')}</p>
                      <p className="text-body-sm text-muted-foreground mt-1">{_('Check back later for updates')}</p>
                    </div>
                  ) : (
                    (notices as any[])?.map((n: any) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border-border/60 hover:border-border transition-colors">
                          <CardContent className="p-3 md:p-4">
                            <div className="flex items-start gap-3 md:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="text-title-sm font-semibold md:truncate">{n.title}</h3>
                                  {priorityBadge(n.priority)}
                                </div>
                                <p className="text-body-md text-foreground whitespace-pre-wrap break-words">{n.content}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-label-xs text-muted-foreground">
                                  <span className="flex items-center gap-1 whitespace-nowrap">
                                    <Icon name="calendar_today" size={14} />
                                    {new Date(n.created_at).toLocaleDateString()}
                                  </span>
                                  {n.expires_at && (
                                    <span className="flex items-center gap-1 whitespace-nowrap">
                                      <Icon name="schedule" size={14} />
                                      {_('Expires')} {new Date(n.expires_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  {n.created_by_name && <span className="flex items-center gap-1 w-full md:w-auto">{_('by')} {n.created_by_role ? `${n.created_by_role} - ` : ''}{n.created_by_name}</span>}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
