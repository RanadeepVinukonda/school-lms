import { useState, useEffect, useCallback } from 'react';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { mindmapService } from '@/services/mindmapService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { getAllClasses } from '@/services/dataService';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import ReactFlow, {
  Background, Controls,
  Node, Edge, useNodesState, useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

export default function TeacherMindMapPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);
  const [pushDone, setPushDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const theme = useUIStore((s) => s.theme);

  const { data: savedMindMaps, isLoading: savedLoading, error: savedError, refetch: refetchSaved } = useQuery({
    queryKey: ['teacher-mindmaps', user?.id],
    enabled: !!user,
    queryFn: () => mindmapService.getUserMindMaps(),
  });

  const { data: viewData, isLoading: viewLoading } = useQuery({
    queryKey: ['mindmap-view', viewId],
    enabled: !!viewId,
    queryFn: () => mindmapService.getById(viewId!),
  });

  const viewNodes: Node[] = (viewData?.nodes || []).map((n: any) => ({
    id: n.id,
    position: { x: n.x || 0, y: n.y || 0 },
    data: { label: n.label },
    style: { background: '#e0f2fe', color: '#0f172a', border: '1px solid #38bdf8', borderRadius: 8, padding: 10 },
  }));

  const viewEdges: Edge[] = (viewData?.edges || []).map((e: any) => ({
    id: e.id, source: e.source, target: e.target, label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#94a3b8' },
  }));

  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const generateMindmap = useCallback(async () => {
    if (!text.trim() || !title.trim()) return;
    setLoading(true);
    setPushDone(false);
    try {
      const result = await mindmapService.generate(text, title);
      setGeneratedId(result.id);
      const flowNodes: Node[] = (result.nodes || []).map((n: any) => ({
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
      const flowEdges: Edge[] = (result.edges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8' },
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
      refetchSaved();
    } catch (err: any) {
      console.error('Mindmap generation failed', err);
    } finally {
      setLoading(false);
    }
  }, [text, title]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          background: theme === 'dark' ? '#1e293b' : '#e0f2fe',
          color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
          border: theme === 'dark' ? '1px solid #334155' : '1px solid #38bdf8',
        },
      }))
    );
  }, [theme]);

  const [assignedClasses, setAssignedClasses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const [assignmentsRes, allClasses] = await Promise.all([
          teacherClassSubjectService.getMyAssignments(),
          getAllClasses(),
        ]);
        const myAssignments = assignmentsRes?.data ?? [];
        const myClassIds = [...new Set(myAssignments.map((a) => a.classId))];
        const myClasses = allClasses
          .filter((c: any) => myClassIds.includes(c.id))
          .map((c: any) => ({ id: c.id, name: `${c.name || ''}${c.section ? ` - ${c.section}` : ''}`.trim() || c.code || c.id }));
        setAssignedClasses(myClasses);
      } catch (e) {
        console.error('Failed to load assigned classes', e);
      }
    })();
  }, []);

  const openPushDialog = useCallback(() => {
    setSelectedClassIds([]);
    setPushDone(false);
    setPushOpen(true);
  }, []);

  const toggleClass = useCallback((classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!generatedId) return;
    setSaving(true);
    setSaved(false);
    try {
      await mindmapService.update(generatedId, {
        title,
        nodes: nodes.map((n) => ({
          id: n.id,
          label: (n.data as any)?.label || '',
          type: 'concept',
          x: n.position.x,
          y: n.position.y,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: typeof e.label === 'string' ? e.label : '',
        })),
      });
      setSaved(true);
      refetchSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to save mind map', err);
    } finally {
      setSaving(false);
    }
  }, [generatedId, title, nodes, edges]);

  const handlePush = useCallback(async () => {
    if (!generatedId || selectedClassIds.length === 0) return;
    setPushing(true);
    try {
      await mindmapService.pushToClasses(generatedId, selectedClassIds);
      setPushDone(true);
    } catch (err: any) {
      console.error('Failed to push mind map', err);
    } finally {
      setPushing(false);
    }
  }, [generatedId, selectedClassIds]);

  return (
    <>
      <SEOHead title={_('AI Mind Map Generator')} description={_('Generate mind maps from concept text')} />
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-container flex items-center justify-center">
              <Icon name="psychology" size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-title-md font-bold">{_('AI Mind Map Generator')}</h1>
              <p className="text-label-sm text-on-surface-variant">{_('Paste concept text to generate a mind map')}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-1 gap-4 p-4 overflow-hidden">
          <Card className="w-96 p-4 flex flex-col gap-4 shrink-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={_('Mind map title...')}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-variant/30 text-on-surface"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={_('Paste your concept text here...')}
              className="flex-1 min-h-[200px] resize-none"
              rows={10}
            />
            <Button onClick={generateMindmap} disabled={loading || !text.trim() || !title.trim()}>
              <Icon name="psychology" size={18} className="mr-2" />
              {loading ? _('Generating...') : _('Generate Mind Map')}
            </Button>
            {generatedId && !pushDone && (
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleSave} disabled={saving}>
                  <Icon name="save" size={18} className="mr-2" />
                  {saving ? _('Saving...') : _('Save')}
                </Button>
                <Button variant="outline" onClick={openPushDialog}>
                  <Icon name="send" size={18} className="mr-2" />
                  {_('Push to Class')}
                </Button>
              </div>
            )}
            {saved && (
              <div className="text-center text-label-sm text-success font-medium py-2 rounded-lg bg-success-container/40">
                {_('Saved')}
              </div>
            )}
            {pushDone && (
              <div className="text-center text-label-sm text-success font-medium py-2 rounded-lg bg-success-container/40">
                {_('Pushed to selected classes')}
              </div>
            )}
          </Card>
          <div className="flex-1 border border-outline-variant rounded-xl overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              attributionPosition="bottom-left"
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4 border-t border-outline-variant">
        <h2 className="text-title-sm font-bold">{_('Saved Mind Maps')}</h2>
        <DataFetchWrapper data={savedMindMaps} isLoading={savedLoading} error={savedError} emptyMessage={_('No saved mind maps. Generate one above!')} loadingType="card" onRetry={() => refetchSaved()}>
          {(maps) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      <Button variant="outline" size="sm" className="shrink-0 text-error" onClick={async () => { await mindmapService.delete(mm.id); refetchSaved(); }}>
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

      <Dialog open={pushOpen} onOpenChange={setPushOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{_('Push Mind Map to Classes')}</DialogTitle>
            <DialogDescription>
              {_('Select the classes that will receive this mind map.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {assignedClasses.length === 0 && (
              <p className="text-label-sm text-muted-foreground text-center py-4">
                {_('No assigned classes found.')}
              </p>
            )}
            {assignedClasses.map((cls) => (
              <label
                key={cls.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedClassIds.includes(cls.id)}
                  onCheckedChange={() => toggleClass(cls.id)}
                />
                <span className="text-label-sm font-medium">{cls.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{_('Cancel')}</Button>
            </DialogClose>
            <Button onClick={handlePush} disabled={pushing || selectedClassIds.length === 0}>
              {pushing ? _('Pushing...') : _('Send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
