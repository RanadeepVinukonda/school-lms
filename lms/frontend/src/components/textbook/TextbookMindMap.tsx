import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import api from '@/services/api';
import type { MindMapNode, MindMapEdge } from '@/types/mindmap';

interface TextbookMindMapData {
  id: string;
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

interface TextbookMindMapProps {
  textbookId: string;
}

const NODE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--tertiary))',
  'hsl(var(--error))',
  'hsl(150, 60%, 45%)',
  'hsl(280, 60%, 55%)',
];

function computeLayout(nodes: MindMapNode[], edges: MindMapEdge[]) {
  if (nodes.length === 0) return { positioned: [], width: 800, height: 500 };

  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source)!.push(e.target);
  }

  const inDegree = new Map<string, number>();
  for (const n of nodes) inDegree.set(n.id, 0);
  for (const e of edges) inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);

  const roots = nodes.filter(n => (inDegree.get(n.id) || 0) === 0);
  if (roots.length === 0) roots.push(nodes[0]);

  const visited = new Set<string>();
  const levels: string[][] = [];

  function bfs(startIds: string[]) {
    let frontier = startIds;
    while (frontier.length > 0) {
      levels.push(frontier);
      const next: string[] = [];
      for (const id of frontier) {
        visited.add(id);
        for (const child of adjacency.get(id) || []) {
          if (!visited.has(child)) next.push(child);
        }
      }
      frontier = next;
    }
  }

  bfs(roots.map(r => r.id));
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      levels.push([n.id]);
      visited.add(n.id);
    }
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const positioned: (MindMapNode & { px: number; py: number })[] = [];

  const maxPerRow = Math.max(...levels.map(l => l.length), 1);
  const cellW = 220;
  const cellH = 100;
  const padX = 120;
  const padY = 80;

  for (let li = 0; li < levels.length; li++) {
    const level = levels[li];
    const rowWidth = level.length * cellW;
    const startX = (800 - rowWidth) / 2 + cellW / 2;

    for (let ni = 0; ni < level.length; ni++) {
      const node = nodeMap.get(level[ni]);
      if (!node) continue;
      positioned.push({
        ...node,
        px: startX + ni * cellW,
        py: padY + li * cellH,
      });
    }
  }

  const maxY = Math.max(...positioned.map(n => n.py), 300);
  return { positioned, width: 800, height: maxY + padY + 40 };
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function TextbookMindMap({ textbookId }: TextbookMindMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['textbook-mindmap', textbookId],
    queryFn: async () => {
      const res = await api.post('/mindmaps/generate-textbook', { textbookId });
      return res.data.data as TextbookMindMapData;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <Icon name="progress_activity" size={40} className="text-primary animate-spin" />
          <p className="text-body-sm text-muted-foreground">Generating mind map…</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <Icon name="error_outline" size={40} className="text-error" />
          <p className="text-body-sm text-muted-foreground">
            {(error as Error)?.message || 'Failed to generate mind map'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Icon name="refresh" size={16} className="mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <Icon name="account_tree" size={40} className="text-muted-foreground" />
          <p className="text-body-sm text-muted-foreground">No mind map data available.</p>
        </CardContent>
      </Card>
    );
  }

  const { positioned, width, height } = computeLayout(data.nodes, data.edges);
  const nodeMap = new Map(positioned.map(n => [n.id, n]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-title-sm font-semibold">{data.title}</h3>
          <p className="text-body-sm text-muted-foreground">
            {data.nodes.length} concepts · {data.edges.length} connections
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Icon name="auto_awesome" size={14} />
          AI Generated
        </Badge>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            style={{ minHeight: 300, maxHeight: 600 }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--muted-foreground))" opacity="0.5" />
              </marker>
            </defs>

            {data.edges.map((edge, i) => {
              const src = nodeMap.get(edge.source);
              const tgt = nodeMap.get(edge.target);
              if (!src || !tgt) return null;

              const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;

              return (
                <g key={edge.id || `e${i}`}>
                  <line
                    x1={src.px}
                    y1={src.py}
                    x2={tgt.px}
                    y2={tgt.py}
                    stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={isHighlighted ? 2 : 1.2}
                    strokeOpacity={isHighlighted ? 0.9 : 0.5}
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-200"
                  />
                  {edge.label && (
                    <text
                      x={(src.px + tgt.px) / 2}
                      y={(src.py + tgt.py) / 2 - 6}
                      textAnchor="middle"
                      fill="hsl(var(--muted-foreground))"
                      fontSize="9"
                      className="select-none pointer-events-none"
                    >
                      {truncate(edge.label, 20)}
                    </text>
                  )}
                </g>
              );
            })}

            {positioned.map((node, i) => {
              const isHovered = hoveredNode === node.id;
              const color = NODE_COLORS[i % NODE_COLORS.length];

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={node.px - 70}
                    y={node.py - 22}
                    width={140}
                    height={44}
                    rx={12}
                    fill={isHovered ? color : 'hsl(var(--background))'}
                    stroke={color}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all duration-200"
                  />
                  <text
                    x={node.px}
                    y={node.py + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isHovered ? 'white' : 'hsl(var(--foreground))'}
                    fontSize="11"
                    fontWeight="500"
                    className="select-none pointer-events-none"
                  >
                    {truncate(node.label, 18)}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}
