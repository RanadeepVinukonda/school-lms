import { useState, useEffect, useCallback } from 'react';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { useUIStore } from '@/store/uiStore';
import { mindmapService } from '@/services/mindmapService';
import ReactFlow, {
  Background, Controls, MiniMap,
  Node, Edge, useNodesState, useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

export default function TeacherMindMapPage() {
  const { _ } = useTranslation();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useUIStore((s) => s.theme);

  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const generateMindmap = useCallback(async () => {
    if (!text.trim() || !title.trim()) return;
    setLoading(true);
    try {
      const result = await mindmapService.generate(text, title);
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
              <MiniMap />
            </ReactFlow>
          </div>
        </div>
      </div>
    </>
  );
}
