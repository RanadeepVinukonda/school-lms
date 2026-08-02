import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { cn } from '@/lib/utils';
import {
  getTeacherRequests,
  searchResourcesForConcept,
  approveResourceRequest,
  declineResourceRequest,
} from '@/services/resourceRequestService';
import type { ResourceRequest, TeachResource } from '@/services/resourceRequestService';

function statusBadge(status: string) {
  switch (status) {
    case 'pending': return <Badge variant="warning">{'Pending'}</Badge>;
    case 'approved': return <Badge variant="success">{'Approved'}</Badge>;
    case 'declined': return <Badge variant="destructive">{'Declined'}</Badge>;
    default: return null;
  }
}

interface ApproveDialogProps {
  request: ResourceRequest;
  onClose: () => void;
}

function ApproveDialog({ request, onClose }: ApproveDialogProps) {
  const { _ } = useTranslation();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const search = useQuery({
    queryKey: ['resource-search', request.conceptId],
    queryFn: () => searchResourcesForConcept(request.conceptId, 8),
    staleTime: 5 * 60 * 1000,
  });

  const approve = useMutation({
    mutationFn: (resources: TeachResource[]) => approveResourceRequest(request.id, resources),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-resource-requests'] });
      onClose();
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const chosen = (search.data || []).filter((v) => selected.has(v.id));
  const searchLoading = search.isLoading || search.isFetching;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border/60 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border/60 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-title-md font-semibold">{_('Push resources')}</h2>
            <p className="text-body-sm text-muted-foreground mt-1">
              {request.studentName || _('Student')} — {request.conceptTitle}{request.subjectName ? ` (${request.subjectName})` : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </Button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {searchLoading && (
            <p className="text-body-sm text-muted-foreground flex items-center gap-2">
              <Icon name="hourglass_top" size={16} /> {_('Searching Khan Academy & YouTube...')}
            </p>
          )}
          {!searchLoading && (search.data || []).length === 0 && (
            <p className="text-body-sm text-muted-foreground">{_('No candidate videos found. Try again or add a custom link.')}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {(search.data || []).map((v) => (
              <div
                key={v.id}
                className={cn(
                  'rounded-2xl transition-all cursor-pointer',
                  selected.has(v.id) && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                onClick={() => toggle(v.id)}
              >
                <ResourceCard
                  resource={v}
                  className={cn(selected.has(v.id) && 'border-primary')}
                  action={
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                        selected.has(v.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-outline bg-background',
                      )}
                      role="checkbox"
                      aria-checked={selected.has(v.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selected.has(v.id) && <Icon name="check" size={16} />}
                    </span>
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-border/60 flex items-center justify-between gap-3">
          <p className="text-label-sm text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : _('Select at least one resource')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>{_('Cancel')}</Button>
            <Button
              size="sm"
              className="gap-1"
              disabled={selected.size === 0}
              loading={approve.isPending}
              onClick={() => approve.mutate(chosen)}
            >
              <Icon name="send" size={14} />
              {_('Push to student')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherResourceRequestsPage() {
  const { _ } = useTranslation();
  const qc = useQueryClient();
  const [activeRequest, setActiveRequest] = useState<ResourceRequest | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-resource-requests'],
    queryFn: getTeacherRequests,
    refetchInterval: 30000,
  });

  const decline = useMutation({
    mutationFn: (id: string) => declineResourceRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-resource-requests'] }),
  });

  const pending = (data || []).filter((r) => r.status === 'pending');
  const history = (data || []).filter((r) => r.status !== 'pending');

  return (
    <>
      <SEOHead title={_('Resource Requests')} description={_('Review student resource requests and push curated videos')} />
      <div className="sm:p-6 p-4 max-w-5xl mx-auto space-y-8 pb-32">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('Resource Requests')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">
            {_('Students request curated resources for concepts they scored low on. Review and push videos back to them.')}
          </p>
        </motion.div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={error ? new Error('Failed to load requests') : null}
          onRetry={refetch}
          loadingType="card"
          emptyMessage={_('No resource requests yet. When a student requests resources, it will appear here.')}
        >
          {() => {
            if (pending.length === 0 && history.length === 0) return null;
            return (
              <div className="space-y-8">
                <div>
                  <h2 className="text-title-md font-semibold flex items-center gap-2 mb-3">
                    <Icon name="inbox" size={18} className="text-primary" />
                    {_('Pending Requests')}
                    {pending.length > 0 && <Badge variant="warning">{pending.length}</Badge>}
                  </h2>
                  {pending.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground">{_('All caught up!')}</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {pending.map((r) => (
                        <Card key={r.id} className="border-border/60">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">{r.subjectName || _('General')}</Badge>
                              {statusBadge(r.status)}
                            </div>
                            <h3 className="text-title-sm font-semibold mt-2">{r.conceptTitle}</h3>
                            {r.chapterTitle && <p className="text-body-sm text-muted-foreground truncate">{r.chapterTitle}</p>}
                            <div className="flex items-center gap-3 mt-2 text-label-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Icon name="person" size={14} />
                                {r.studentName || _('Student')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Icon name="calendar_today" size={14} />
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {r.reason && <p className="text-body-sm mt-2">{r.reason}</p>}
                            <div className="flex items-center gap-2 mt-4">
                              <Button size="sm" className="gap-1 flex-1" onClick={() => setActiveRequest(r)}>
                                <Icon name="send" size={14} />
                                {_('Approve & push')}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1 flex-shrink-0"
                                loading={decline.isPending && decline.variables === r.id}
                                onClick={() => decline.mutate(r.id)}
                              >
                                <Icon name="close" size={14} />
                                {_('Decline')}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {history.length > 0 && (
                  <div>
                    <h2 className="text-title-md font-semibold flex items-center gap-2 mb-3">
                      <Icon name="history" size={18} className="text-primary" />
                      {_('History')}
                    </h2>
                    <div className="space-y-2">
                      {history.map((r) => (
                        <Card key={r.id} className="border-border/60">
                          <CardContent className="p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-title-sm font-semibold truncate">{r.conceptTitle}</span>
                                {statusBadge(r.status)}
                              </div>
                              <p className="text-body-sm text-muted-foreground">
                                {r.studentName || _('Student')} — {new Date(r.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            {r.status === 'declined' && r.declinedReason && (
                              <p className="text-label-sm text-muted-foreground text-right max-w-[40%]">{r.declinedReason}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        </DataFetchWrapper>
      </div>

      {activeRequest && (
        <ApproveDialog request={activeRequest} onClose={() => setActiveRequest(null)} />
      )}
    </>
  );
}
