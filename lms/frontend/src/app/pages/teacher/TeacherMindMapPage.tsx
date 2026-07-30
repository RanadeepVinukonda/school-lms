import { useState, useEffect, useCallback } from 'react';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useUIStore } from '@/store/uiStore';
import { mindmapService } from '@/services/mindmapService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { getAllClasses } from '@/services/dataService';
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
  const theme = useUIStore((s) => s.theme);

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
          label: e.label || '',
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to save mind map', err);
    } finally {
      setSaving(false);
    }
  }, [generatedId, nodes, edges]);

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
