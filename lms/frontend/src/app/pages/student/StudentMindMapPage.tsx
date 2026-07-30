import { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { mindmapService } from '@/services/mindmapService';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

export default function StudentMindMapPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: myMindMaps, isLoading, error, refetch } = useQuery({
    queryKey: ['student-mymindmaps', user?.id],
    enabled: !!user,
    queryFn: () => mindmapService.getUserMindMaps(),
  });

  const { data: sharedMindMaps } = useQuery({
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
    style: {
      background: '#e0f2fe',
      color: '#0f172a',
      border: '1px solid #38bdf8',
      borderRadius: 8,
      padding: 10,
    },
  }));

  const viewEdges: Edge[] = (viewData?.edges || []).map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#94a3b8' },
  }));

  const handleGenerate = useCallback(async () => {
    if (!text.trim() || !title.trim()) return;
    setGenerating(true);
    try {
      await mindmapService.generate(text, title);
      setText('');
      setTitle('');
      refetch();
    } catch (err: any) {
      console.error('Failed to generate mind map', err);
    } finally {
      setGenerating(false);
    }
  }, [text, title, refetch]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await mindmapService.delete(id);
      refetch();
    } catch (err: any) {
      console.error('Failed to delete mind map', err);
    }
  }, [refetch]);

  return (
    <>
      <SEOHead title={_('Mind Maps')} description={_('Create and view mind maps')} />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div>
          <h1 className="text-headline-sm font-bold">{_('Mind Maps')}</h1>
          <p className="text-body-md text-muted-foreground">{_('Create your own mind maps or view shared ones')}</p>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-title-sm">{_('Create Mind Map')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={_('Title...')}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-variant/30 text-on-surface"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={_('Paste concept text to generate a mind map...')}
              rows={5}
              className="resize-none"
            />
            <Button onClick={handleGenerate} disabled={generating || !text.trim() || !title.trim()}>
              <Icon name="psychology" size={18} className="mr-2" />
              {generating ? _('Generating...') : _('Generate')}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-title-sm font-bold">{_('My Mind Maps')}</h2>
          <DataFetchWrapper data={myMindMaps} isLoading={isLoading} error={error} emptyMessage={_('No mind maps yet. Create one above!')} loadingType="card" onRetry={() => refetch()}>
            {(maps) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {maps.map((mm: any) => (
                  <Card key={mm.id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                          <Icon name="psychology" size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-title-sm font-semibold truncate">{mm.title}</p>
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
            )}
          </DataFetchWrapper>
        </div>

        {sharedMindMaps && sharedMindMaps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-title-sm font-bold">{_('Shared with Me')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sharedMindMaps.map((mm: any) => (
                <Card key={mm.id} className="border-border/60 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setViewId(mm.id)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                      <Icon name="psychology" size={20} className="text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-title-sm font-semibold truncate">{mm.title}</p>
                      {mm.description && <p className="text-label-sm text-muted-foreground truncate">{mm.description}</p>}
                    </div>
                    <Icon name="chevron_right" size={18} className="text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!viewId} onOpenChange={(o) => { if (!o) setViewId(null); }}>
        <DialogContent className="max-w-4xl max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle>{viewData?.title || _('Mind Map')}</DialogTitle>
            {viewData?.description && <DialogDescription>{viewData.description}</DialogDescription>}
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : viewNodes.length > 0 ? (
            <div className="h-[60vh] border border-outline-variant rounded-xl overflow-hidden">
              <ReactFlow
                nodes={viewNodes}
                edges={viewEdges}
                fitView
                attributionPosition="bottom-left"
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{_('No nodes in this mind map.')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
