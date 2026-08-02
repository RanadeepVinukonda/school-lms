import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { ResourceCardGrid } from '@/components/resources/ResourceCardGrid';
import {
  getRecommendations,
  getMyResources,
  getMyRequests,
  createResourceRequest,
} from '@/services/resourceRequestService';
import type { ConceptRecommendation } from '@/services/resourceRequestService';

function requestBadge(status: string) {
  switch (status) {
    case 'pending': return <Badge variant="warning">{'Pending'}</Badge>;
    case 'approved': return <Badge variant="success">{'Approved'}</Badge>;
    case 'declined': return <Badge variant="destructive">{'Declined'}</Badge>;
    default: return null;
  }
}

export default function StudentResourcesPage() {
  const { _ } = useTranslation();
  const [activeTab, setActiveTab] = useState('recommended');
  const qc = useQueryClient();

  const recommendations = useQuery({ queryKey: ['student-resources-recommendations'], queryFn: getRecommendations });
  const resources = useQuery({ queryKey: ['student-resources-mine'], queryFn: getMyResources });
  const requests = useQuery({ queryKey: ['student-resource-requests'], queryFn: getMyRequests });

  const requestMutation = useMutation({
    mutationFn: (conceptId: string) => createResourceRequest(conceptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-resources-recommendations'] });
      qc.invalidateQueries({ queryKey: ['student-resource-requests'] });
    },
  });

  return (
    <>
      <SEOHead title={_('Resources')} description={_('Recommended concepts and curated learning resources')} />
      <div className="sm:p-6 p-4 max-w-5xl mx-auto space-y-8 pb-32">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('Resources')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">
            {_('Concepts you scored low on, plus curated resources shared by your teachers')}
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto inline-flex">
            <TabsTrigger value="recommended" className="gap-2">
              <Icon name="lightbulb" size={16} />
              <span className="hidden sm:inline">{_('Recommended for You')}</span>
              <span className="sm:hidden">{_('Recommended')}</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <Icon name="video_library" size={16} />
              <span className="hidden sm:inline">{_('My Resources')}</span>
              <span className="sm:hidden">{_('Resources')}</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Icon name="assignment" size={16} />
              <span className="hidden sm:inline">{_('My Requests')}</span>
              <span className="sm:hidden">{_('Requests')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="mt-6">
            <DataFetchWrapper
              data={recommendations.data}
              isLoading={recommendations.isLoading}
              error={recommendations.error ? new Error('Failed to load recommendations') : null}
              onRetry={recommendations.refetch}
              loadingType="card"
              emptyMessage={_('No weak concepts yet. Score low on an exam to see recommended resources here.')}
            >
              {() => (
                <div className="grid gap-4 md:grid-cols-2">
                  {(recommendations.data || []).map((item: ConceptRecommendation) => (
                    <motion.div
                      key={item.conceptId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border-border/60 h-full flex flex-col">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-[10px]">{item.subjectName || _('General')}</Badge>
                                {requestBadge(item.requestStatus)}
                              </div>
                              <CardTitle className="text-title-sm mt-2 leading-snug">{item.conceptTitle}</CardTitle>
                              {item.chapterTitle && (
                                <p className="text-body-sm text-muted-foreground mt-1 truncate">{item.chapterTitle}</p>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 flex-1 flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-label-sm text-muted-foreground">
                            <Icon name="trending_down" size={16} />
                            <span>{_('Mastery')}: {Math.round(item.masteryScore * 100)}%</span>
                            {item.attemptCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Icon name="repeat" size={14} />
                                {item.attemptCount}
                              </span>
                            )}
                          </div>
                          {item.requestStatus === 'none' && (
                            <Button
                              size="sm"
                              className="mt-auto self-start gap-1"
                              loading={requestMutation.isPending && requestMutation.variables === item.conceptId}
                              onClick={() => requestMutation.mutate(item.conceptId)}
                            >
                              <Icon name="help" size={14} />
                              {_('Request resources')}
                            </Button>
                          )}
                          {item.requestStatus === 'pending' && (
                            <p className="mt-auto text-label-sm text-warning flex items-center gap-1">
                              <Icon name="schedule" size={14} />
                              {_('Your teacher has been notified')}
                            </p>
                          )}
                          {item.requestStatus === 'approved' && (
                            <p className="mt-auto text-label-sm text-success flex items-center gap-1">
                              <Icon name="check" size={14} />
                              {_('Resources are ready — see My Resources tab')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            <DataFetchWrapper
              data={resources.data}
              isLoading={resources.isLoading}
              error={resources.error ? new Error('Failed to load resources') : null}
              onRetry={resources.refetch}
              loadingType="card"
              emptyMessage={_('No resources yet. Request resources for a weak concept and your teacher will share curated videos.')}
            >
              {() => {
                const groups = resources.data || [];
                if (groups.length === 0) return null;
                return (
                  <div className="space-y-8">
                    {groups.map((group) => (
                      <div key={group.subject}>
                        <h2 className="text-title-md font-semibold flex items-center gap-2 mb-3">
                          <Icon name="folder" size={18} className="text-primary" />
                          {group.subject}
                        </h2>
                        <div className="space-y-5">
                          {group.concepts.map((c) => (
                            <div key={c.concept}>
                              <h3 className="text-body-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                {c.concept}
                              </h3>
                              <ResourceCardGrid items={c.items} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <DataFetchWrapper
              data={requests.data}
              isLoading={requests.isLoading}
              error={requests.error ? new Error('Failed to load requests') : null}
              onRetry={requests.refetch}
              loadingType="card"
              emptyMessage={_('No resource requests yet')}
            >
              {() => {
                const items = requests.data || [];
                if (items.length === 0) return null;
                return (
                  <div className="space-y-3">
                    {items.map((r) => (
                      <Card key={r.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-[10px]">{r.subjectName || _('General')}</Badge>
                                {requestBadge(r.status)}
                              </div>
                              <h3 className="text-title-sm font-semibold mt-2">{r.conceptTitle}</h3>
                              <p className="text-body-sm text-muted-foreground mt-1">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </p>
                              {r.status === 'declined' && r.declinedReason && (
                                <p className="text-body-sm text-muted-foreground mt-2">{r.declinedReason}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              }}
            </DataFetchWrapper>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
