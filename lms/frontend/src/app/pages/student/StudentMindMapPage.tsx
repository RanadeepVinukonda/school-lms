import { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { mindmapService } from '@/services/mindmapService';
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas';
import type { Node, Edge } from 'reactflow';

export default function StudentMindMapPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [viewId, setViewId] = useState<string | null>(null);

  const { data: sharedMindMaps, isLoading, error, refetch } = useQuery({
    queryKey: ['student-shared-mindmaps-page', user?.id],
    enabled: !!user,
    queryFn: () => mindmapService.getSharedMindMaps(),
  });

  const { data: viewData, isLoading: viewLoading } = useQuery({
    queryKey: ['mindmap-view-page', viewId],
    enabled: !!viewId,
    queryFn: () => mindmapService.getById(viewId!),
  });

  const viewNodes: Node[] = (viewData?.nodes || []).map((n: any) => ({
    id: n.id,
    position: { x: n.x || 0, y: n.y || 0 },
    data: { label: n.label },
  }));

  const viewEdges: Edge[] = (viewData?.edges || []).map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }));

  const handleDelete = useCallback(async (id: string) => {
    try {
      await mindmapService.removeShared(id);
      toast.success(_('Mind map removed'));
      refetch();
    } catch (err: any) {
      toast.error(err?.message || _('Failed to remove mind map'));
    }
  }, [refetch]);

  return (
    <>
      <SEOHead title={_('Mind Maps')} description={_('View mind maps shared by your teachers')} />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div>
          <h1 className="text-headline-sm font-bold">{_('Mind Maps')}</h1>
          <p className="text-body-md text-muted-foreground">{_('View mind maps pushed by your teachers')}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-title-sm font-bold">{_('Teacher Mind Maps')}</h2>
          <DataFetchWrapper data={sharedMindMaps} isLoading={isLoading} error={error} emptyMessage={_('No mind maps shared by your teachers yet.')} loadingType="card" onRetry={() => refetch()}>
            {(maps) => {
              const groups = (maps || []).reduce<Record<string, any[]>>((acc, mm: any) => {
                const key = mm.subjectName || _('General');
                (acc[key] = acc[key] || []).push(mm);
                return acc;
              }, {});
              return (
                <div className="space-y-6">
                  {Object.entries(groups).map(([subject, list]) => (
                    <div key={subject}>
                      <h3 className="text-title-sm font-semibold flex items-center gap-2 mb-3">
                        <Icon name="folder" size={16} className="text-primary" />
                        {subject}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {list.map((mm: any) => (
                          <Card key={mm.id} className="border-border/60">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                                  <Icon name="psychology" size={20} className="text-secondary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-title-sm font-semibold truncate">{mm.title}</p>
                                  {mm.subjectName && <p className="text-label-sm font-medium text-primary truncate">{mm.subjectName}</p>}
                                  {mm.description && <p className="text-label-sm text-muted-foreground truncate">{mm.description}</p>}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewId(mm.id)}>
                                  <Icon name="visibility" size={16} className="mr-1" /> {_('View')}
                                </Button>
                                <Button variant="outline" size="sm" className="shrink-0 text-error" onClick={() => handleDelete(mm.id)}>
                                  <Icon name="delete" size={16} />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }}
          </DataFetchWrapper>
        </div>
      </div>

      <Dialog open={!!viewId} onOpenChange={(o) => { if (!o) setViewId(null); }}>
        <DialogContent className="max-w-4xl max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle>{viewData?.title || _('Mind Map')}</DialogTitle>
            {viewData?.subjectName && <p className="text-title-sm font-medium text-primary">{viewData.subjectName}</p>}
            {viewData?.description && <DialogDescription>{viewData.description}</DialogDescription>}
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : viewNodes.length > 0 ? (
            <div className="h-[60vh] border border-outline-variant rounded-xl overflow-hidden">
              <MindMapCanvas
                nodes={viewNodes}
                edges={viewEdges}
                layout="none"
                showMiniMap
                className="h-full w-full border-0 rounded-none"
              />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{_('No nodes in this mind map.')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
