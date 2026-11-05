import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import ReactFlow, {
  Background, MarkerType,
  Node, Edge, useNodesState, useEdgesState,
  type OnNodesChange, type OnEdgesChange,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { useUIStore } from '@/store/uiStore';

export const MIND_MAP_NODE_WIDTH = 180;
export const MIND_MAP_NODE_HEIGHT = 48;

export function getMindMapIsDark(theme: string): boolean {
  if (theme === 'dark') return true;
  if (theme === 'system') {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function mindMapNodeStyle(isDark: boolean): CSSProperties {
  return {
    background: isDark ? '#1e293b' : '#e0f2fe',
    color: isDark ? '#e2e8f0' : '#0f172a',
    border: isDark ? '1px solid #334155' : '1px solid #38bdf8',
    borderRadius: 8,
    padding: 10,
  };
}

const EDGE_STYLE: CSSProperties = { stroke: '#94a3b8', strokeWidth: 1.5 };

interface MindMapCanvasProps {
  nodes: Node[];
  edges: Edge[];
  /** 'dagre' computes a hierarchical layout; 'none' keeps the given positions. */
  layout?: 'dagre' | 'none';
  rankdir?: 'TB' | 'LR';
  collapsible?: boolean;
  showMiniMap?: boolean;
  onNodeClick?: (node: Node) => void;
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  nodesDraggable?: boolean;
  className?: string;
}

function computeDagreLayout(nodes: Node[], edges: Edge[], rankdir: 'TB' | 'LR'): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir, nodesep: 60, ranksep: 90, marginx: 30, marginy: 30 });
  nodes.forEach((n) => graph.setNode(n.id, { width: MIND_MAP_NODE_WIDTH, height: MIND_MAP_NODE_HEIGHT }));
  edges.forEach((e) => graph.setEdge(e.source, e.target));
  dagre.layout(graph);
  return nodes.map((n) => {
    const p = graph.node(n.id);
    return {
      ...n,
      position: { x: p.x - MIND_MAP_NODE_WIDTH / 2, y: p.y - MIND_MAP_NODE_HEIGHT / 2 },
    };
  });
}

export function MindMapCanvas({
  nodes,
  edges,
  layout = 'dagre',
  rankdir = 'LR',
  collapsible = false,
  showMiniMap = true,
  onNodeClick,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  nodesDraggable = false,
  className,
}: MindMapCanvasProps) {
  const theme = useUIStore((s) => s.theme);
  const isDark = getMindMapIsDark(theme);
  const rfRef = useRef<any>(null);

  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, []);
      map.get(e.source)!.push(e.target);
    }
    return map;
  }, [edges]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const hiddenIds = useMemo(() => {
    const hidden = new Set<string>();
    for (const id of collapsed) {
      const stack = [...(childrenMap.get(id) || [])];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        if (!hidden.has(cur)) {
          hidden.add(cur);
          stack.push(...(childrenMap.get(cur) || []));
        }
      }
    }
    return hidden;
  }, [collapsed, childrenMap]);

  const visibleNodes = useMemo(() => nodes.filter((n) => !hiddenIds.has(n.id)), [nodes, hiddenIds]);
  const visibleEdges = useMemo(
    () => edges.filter((e) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target)),
    [edges, hiddenIds],
  );

  const styledNodes = useMemo(() => {
    const base = layout === 'dagre'
      ? computeDagreLayout(visibleNodes, visibleEdges, rankdir)
      : visibleNodes;
    return base.map((n) =>
      n.style
        ? n
        : { ...n, style: mindMapNodeStyle(isDark) },
    );
  }, [visibleNodes, visibleEdges, layout, rankdir, isDark]);

  const styledEdges = useMemo(
    () =>
      visibleEdges.map((e) => ({
        ...e,
        type: e.type || 'smoothstep',
        style: e.style || EDGE_STYLE,
        markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      })),
    [visibleEdges],
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(styledNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(styledEdges);

  useEffect(() => {
    setFlowNodes(styledNodes);
    setFlowEdges(styledEdges);
  }, [styledNodes, styledEdges, setFlowNodes, setFlowEdges]);

  const layoutSignature = useMemo(
    () =>
      styledNodes
        .map((n) => n.id)
        .sort()
        .join(',') + '|' + styledEdges.map((e) => `${e.source}>${e.target}`).sort().join(','),
    [styledNodes, styledEdges],
  );

  useEffect(() => {
    if (!rfRef.current) return;
    requestAnimationFrame(() => rfRef.current?.fitView({ padding: 0.15, duration: 200 }));
  }, [layoutSignature]);

  const handleNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      onNodesChange(changes);
      onNodesChangeProp?.(changes);
    },
    [onNodesChange, onNodesChangeProp],
  );

  const handleEdgesChange = useCallback<OnEdgesChange>(
    (changes) => {
      onEdgesChange(changes);
      onEdgesChangeProp?.(changes);
    },
    [onEdgesChange, onEdgesChangeProp],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (collapsible && (childrenMap.get(node.id)?.length || 0) > 0) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          return next;
        });
        return;
      }
      onNodeClick?.(node);
    },
    [collapsible, childrenMap, onNodeClick],
  );

  if (styledNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[320px] text-muted-foreground text-sm">
        No mind map nodes to display.
      </div>
    );
  }

  return (
    <div className={className || 'h-[60vh] min-h-[400px] w-full rounded-xl border border-border/40 overflow-hidden bg-muted/10'}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={handleNodeClick}
        onInit={(instance) => { rfRef.current = instance; }}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={nodesDraggable}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={3}
        panOnDrag
        zoomOnScroll
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
