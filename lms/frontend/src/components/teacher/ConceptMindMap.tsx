import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';

interface ConceptNode {
  id: string;
  title: string;
  summary?: string;
  notes?: string;
  order?: number;
  videos?: { id: string; title: string; youtubeId: string; channelName?: string; duration?: string }[];
  questionBank?: any[];
  difficulty?: string;
  learningObjectives?: string[];
  keywords?: string[];
  prerequisites?: string[];
  estimatedMinutes?: number;
}

interface ConceptMindMapProps {
  concepts: ConceptNode[];
  chapterTitle?: string;
  onSelectConcept?: (conceptId: string) => void;
  selectedConceptId?: string;
}

interface TreeNode {
  id: string;
  title: string;
  node: ConceptNode;
  children: TreeNode[];
  depth: number;
  x: number;
  y: number;
  collapsed: boolean;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;
const LEVEL_GAP = 100;
const SIBLING_GAP = 20;

function buildTree(concepts: ConceptNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const childMap = new Map<string, string[]>();

  for (const c of concepts) {
    nodeMap.set(c.id, {
      id: c.id,
      title: c.title,
      node: c,
      children: [],
      depth: 0,
      x: 0,
      y: 0,
      collapsed: false,
    });
  }

  const rootIds = new Set(nodeMap.keys());

  for (const c of concepts) {
    if (c.prerequisites && c.prerequisites.length > 0) {
      for (const prereqTitle of c.prerequisites) {
        const prereq = concepts.find((o) => o.title.toLowerCase() === prereqTitle.toLowerCase());
        if (prereq && nodeMap.has(prereq.id)) {
          rootIds.delete(c.id);
          if (!childMap.has(prereq.id)) childMap.set(prereq.id, []);
          childMap.get(prereq.id)!.push(c.id);
        }
      }
    }
  }

  function assignDepths(ids: string[], depth: number) {
    for (const id of ids) {
      const node = nodeMap.get(id);
      if (!node) continue;
      node.depth = Math.max(node.depth, depth);
      const children = childMap.get(id) || [];
      assignDepths(children, depth + 1);
    }
  }

  assignDepths([...rootIds], 0);

  for (const c of concepts) {
    const children = childMap.get(c.id) || [];
    for (const childId of children) {
      const child = nodeMap.get(childId);
      if (child) nodeMap.get(c.id)!.children.push(child);
    }
  }

  const roots = [...rootIds].map((id) => nodeMap.get(id)!).sort((a, b) => (a.node.order ?? 0) - (b.node.order ?? 0));

  function layoutSubtree(node: TreeNode, x: number, y: number): number {
    node.x = x;
    node.y = y;
    if (node.collapsed || node.children.length === 0) return 1;
    let childX = x - ((node.children.length - 1) * SIBLING_GAP) / 2;
    for (const child of node.children) {
      const count = layoutSubtree(child, childX, y + LEVEL_GAP);
      childX += count * SIBLING_GAP;
    }
    return node.children.reduce((sum, ch) => sum + (ch.collapsed || ch.children.length === 0 ? 1 : ch.children.length), 0);
  }

  let startX = -(roots.length - 1) * SIBLING_GAP / 2;
  for (const root of roots) {
    layoutSubtree(root, startX * SIBLING_GAP, 0);
    startX += 1;
  }

  return roots;
}

function getAllVisibleNodes(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(node: TreeNode) {
    result.push(node);
    if (!node.collapsed) {
      for (const child of node.children) walk(child);
    }
  }
  for (const root of roots) walk(root);
  return result;
}

export function ConceptMindMap({ concepts, chapterTitle, onSelectConcept, selectedConceptId }: ConceptMindMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(selectedConceptId ?? null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const roots = buildTree(concepts);
    setTree(roots);
  }, [concepts]);

  const visibleNodes = useMemo(() => getAllVisibleNodes(tree), [tree]);

  const toggleCollapse = useCallback((id: string) => {
    setTree((prev) => {
      function walk(nodes: TreeNode[]): TreeNode[] {
        return nodes.map((n) => {
          if (n.id === id) return { ...n, collapsed: !n.collapsed };
          return { ...n, children: walk(n.children) };
        });
      }
      return walk(prev);
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    onSelectConcept?.(id);
  }, [onSelectConcept]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(3, Math.max(0.3, prev.scale * delta)),
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setTransform((prev) => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const minX = useMemo(() => Math.min(...visibleNodes.map((n) => n.x)), [visibleNodes]);
  const minY = useMemo(() => Math.min(...visibleNodes.map((n) => n.y)), [visibleNodes]);
  const maxX = useMemo(() => Math.max(...visibleNodes.map((n) => n.x + NODE_WIDTH)), [visibleNodes]);
  const maxY = useMemo(() => Math.max(...visibleNodes.map((n) => n.y + NODE_HEIGHT)), [visibleNodes]);

  const viewBoxWidth = Math.max(800, maxX - minX + 200);
  const viewBoxHeight = Math.max(400, maxY - minY + 200);

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Icon name="account_tree" size={16} className="text-primary" />
                {chapterTitle || 'Concept Map'}
              </h3>
              <span className="text-[10px] text-muted-foreground">Scroll to zoom &middot; Drag to pan &middot; Click to expand/collapse</span>
            </div>
            <svg
              ref={svgRef}
              viewBox={`${minX - 100} ${minY - 60} ${viewBoxWidth} ${viewBoxHeight}`}
              className="w-full h-auto max-h-[500px] border border-border/40 rounded-lg bg-muted/10"
              style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`scale(${transform.scale}) translate(${transform.x / transform.scale}, ${transform.y / transform.scale})`}>
                {/* Connection lines */}
                {tree.map((root) => (
                  <Connections key={`conn-${root.id}`} node={root} />
                ))}

                {/* Node groups */}
                {visibleNodes.map((node) => {
                  const isSelected = selectedId === node.id;
                  const hasChildren = node.children.length > 0;
                  const fill = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--background))';
                  const stroke = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))';
                  const textFill = isSelected ? 'white' : 'hsl(var(--foreground))';

                  return (
                    <g
                      key={node.id}
                      onClick={() => handleSelect(node.id)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={node.x}
                        y={node.y}
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx={8}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={node.x + NODE_WIDTH / 2}
                        y={node.y + NODE_HEIGHT / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textFill}
                        fontSize={11}
                        fontWeight={isSelected ? 'bold' : 'normal'}
                        className="select-none pointer-events-none"
                      >
                        {node.title.length > 18 ? node.title.slice(0, 16) + '…' : node.title}
                      </text>
                      {/* Collapse/expand toggle */}
                      {hasChildren && (
                        <g
                          onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={node.x + NODE_WIDTH - 12}
                            cy={node.y + NODE_HEIGHT - 12}
                            r={8}
                            fill="hsl(var(--primary) / 0.15)"
                            stroke="hsl(var(--primary))"
                            strokeWidth={1}
                          />
                          <text
                            x={node.x + NODE_WIDTH - 12}
                            y={node.y + NODE_HEIGHT - 12}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="hsl(var(--primary))"
                            fontSize={10}
                            className="select-none pointer-events-none"
                          >
                            {node.collapsed ? '+' : '−'}
                          </text>
                        </g>
                      )}
                      {/* Difficulty indicator */}
                      {node.node.difficulty && (
                        <circle
                          cx={node.x + 8}
                          cy={node.y + 8}
                          r={4}
                          fill={
                            node.node.difficulty === 'beginner' ? 'hsl(var(--success))' :
                            node.node.difficulty === 'intermediate' ? 'hsl(var(--warning))' :
                            'hsl(var(--error))'
                          }
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </CardContent>
        </Card>
      </div>

      {/* Detail panel */}
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

function Connections({ node }: { node: TreeNode }) {
  if (node.collapsed || node.children.length === 0) return null;
  return (
    <>
      {node.children.map((child) => {
        const parentCenterX = node.x + NODE_WIDTH / 2;
        const parentBottom = node.y + NODE_HEIGHT;
        const childCenterX = child.x + NODE_WIDTH / 2;
        const childTop = child.y;
        return (
          <g key={`line-${node.id}-${child.id}`}>
            <line
              x1={parentCenterX}
              y1={parentBottom}
              x2={parentCenterX}
              y2={parentBottom + (childTop - parentBottom) / 2}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              strokeOpacity={0.5}
            />
            <line
              x1={parentCenterX}
              y1={parentBottom + (childTop - parentBottom) / 2}
              x2={childCenterX}
              y2={parentBottom + (childTop - parentBottom) / 2}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              strokeOpacity={0.5}
            />
            <line
              x1={childCenterX}
              y1={parentBottom + (childTop - parentBottom) / 2}
              x2={childCenterX}
              y2={childTop}
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
              strokeOpacity={0.5}
            />
          </g>
        );
      })}
      {node.children.map((child) => (
        <Connections key={`sub-${child.id}`} node={child} />
      ))}
    </>
  );
}
