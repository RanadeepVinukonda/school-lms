import { useState, useMemo, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background, Controls,
  Node, Edge, MarkerType,
  useNodesState, useEdgesState,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';

interface ConceptNode {
  id: string;
  title: string;
  summary?: string;
  notes?: string;
  order?: number;
  chapterId?: string;
  videos?: { id: string; title: string; youtubeId: string; channelName?: string; duration?: string }[];
  questionBank?: any[];
  difficulty?: string;
  learningObjectives?: string[];
  keywords?: string[];
  prerequisites?: string[];
  estimatedMinutes?: number;
}

interface ChapterInfo {
  id: string;
  title: string;
  conceptsList: ConceptNode[];
}

interface ConceptMindMapProps {
  concepts: ConceptNode[];
  chapterTitle?: string;
  chapters?: ChapterInfo[];
  onSelectConcept?: (conceptId: string) => void;
  selectedConceptId?: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 50;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

function layout(nodes: Node[], edges: Edge[], rankdir = 'LR') {
  dagreGraph.setGraph({ rankdir, nodesep: 250, ranksep: 120, marginx: 50, marginy: 50 });
  nodes.forEach((n) => dagreGraph.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => dagreGraph.setEdge(e.source, e.target));
  dagre.layout(dagreGraph);
  return {
    nodes: nodes.map((n) => {
      const p = dagreGraph.node(n.id);
      return { ...n, position: { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 } };
    }),
    edges,
  };
}

export function ConceptMindMap({ concepts, chapterTitle, chapters, onSelectConcept, selectedConceptId }: ConceptMindMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedConceptId ?? null);
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  const isTeacherView = !!chapters && chapters.length > 0;

  const rawNodesEdges = useMemo(() => {
    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];

    if (isTeacherView) {
      const rootTitle = chapterTitle?.replace(/\s*—\s*All Concepts$/, '') || 'Textbook';
      rawNodes.push({
        id: 'root',
        type: 'input',
        data: { label: rootTitle, type: 'textbook' },
        position: { x: 0, y: 0 },
        style: {
          background: '#1e40af',
          color: '#fff',
          border: '2px solid #1e3a8a',
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: 15,
          fontWeight: 700,
        },
      });

      chapters!.forEach((ch) => {
        const chId = `ch-${ch.id}`;
        const collapsed = collapsedChapters.has(ch.id);

        rawNodes.push({
          id: chId,
          data: { label: ch.title, type: 'chapter', chapterId: ch.id },
          position: { x: 0, y: 0 },
          style: {
            background: '#3b82f6',
            color: '#fff',
            border: '1px solid #2563eb',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
          },
        });

        rawEdges.push({
          id: `e-root-${ch.id}`,
          source: 'root',
          target: chId,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        });

        if (!collapsed) {
          ch.conceptsList.forEach((cp) => {
            const cpId = `cp-${cp.id}`;
            rawNodes.push({
              id: cpId,
              data: { label: cp.title, type: 'concept', original: cp },
              position: { x: 0, y: 0 },
              style: {
                background: '#e0f2fe',
                color: '#0f172a',
                border: '1px solid #38bdf8',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 11,
              },
            });

            rawEdges.push({
              id: `e-${ch.id}-${cp.id}`,
              source: chId,
              target: cpId,
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
              style: { stroke: '#94a3b8', strokeWidth: 1.5 },
            });
          });
        }
      });
    } else {
      rawNodes.push({
        id: 'root',
        type: 'input',
        data: { label: chapterTitle || 'Concepts', type: 'chapter' },
        position: { x: 0, y: 0 },
        style: {
          background: '#3b82f6',
          color: '#fff',
          border: '1px solid #2563eb',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
        },
      });

      concepts.forEach((cp) => {
        rawNodes.push({
          id: `cp-${cp.id}`,
          data: { label: cp.title, type: 'concept', original: cp },
          position: { x: 0, y: 0 },
          style: {
            background: '#e0f2fe',
            color: '#0f172a',
            border: '1px solid #38bdf8',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
          },
        });

        rawEdges.push({
          id: `e-root-${cp.id}`,
          source: 'root',
          target: `cp-${cp.id}`,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
          style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        });
      });
    }

    return { nodes: rawNodes, edges: rawEdges };
  }, [concepts, chapterTitle, chapters, collapsedChapters, isTeacherView]);

  const layouted = useMemo(() => {
    if (rawNodesEdges.nodes.length === 0) return { nodes: [], edges: [] };
    return layout(rawNodesEdges.nodes, rawNodesEdges.edges);
  }, [rawNodesEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  useEffect(() => {
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [layouted, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const data = node.data as any;
    if (data.type === 'chapter' && isTeacherView) {
      setCollapsedChapters((prev) => {
        const next = new Set(prev);
        if (next.has(data.chapterId)) next.delete(data.chapterId);
        else next.add(data.chapterId);
        return next;
      });
    }
    if (data.type === 'concept') {
      const id = node.id.replace('cp-', '');
      setSelectedId(id);
      onSelectConcept?.(id);
    }
  }, [isTeacherView, onSelectConcept]);

  const selected = concepts.find((c) => c.id === selectedId);

  if (concepts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Icon name="psychology" size={48} className="mx-auto mb-3 opacity-40" />
          <p>No concepts defined yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Icon name="account_tree" size={16} className="text-primary" />
                {chapterTitle || 'Concept Map'}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                Scroll to zoom &middot; Drag to pan &middot; Click chapter to expand/collapse
              </span>
            </div>
            <div className="w-full h-[500px] border border-border/40 rounded-lg bg-muted/10">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                attributionPosition="bottom-left"
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                minZoom={0.3}
                maxZoom={3}
              >
                <Background />
                <Controls />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        {selected ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1">{selected.title}</h3>
                {selected.difficulty && <Badge variant="outline" className="text-[10px] capitalize mb-2">{selected.difficulty}</Badge>}
                {selected.estimatedMinutes && <span className="text-[10px] text-muted-foreground ml-1">{selected.estimatedMinutes} min</span>}
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{selected.summary || 'No summary'}</p>
              </CardContent>
            </Card>

            {(selected.videos?.length ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h4 className="text-xs font-semibold flex items-center gap-1"><Icon name="smart_display" size={14} className="text-primary" /> Videos</h4>
                  {selected.videos!.map((v) => (
                    <div key={v.id} className="flex items-start gap-2">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Icon name="play_arrow" size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{v.title}</p>
                        <p className="text-[10px] text-muted-foreground">{v.channelName}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {(selected.keywords?.length ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Icon name="label" size={14} className="text-primary" /> Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {selected.keywords!.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(selected.learningObjectives?.length ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Icon name="track_changes" size={14} className="text-tertiary" /> Objectives</h4>
                  <ul className="space-y-1">
                    {selected.learningObjectives!.map((obj, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex gap-1">
                        <span className="text-tertiary">•</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(selected.notes?.length ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-xs font-semibold mb-1 flex items-center gap-1"><Icon name="menu_book" size={14} className="text-primary" /> Notes</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">{selected.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Icon name="touch_app" size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Click a concept node to see details</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
