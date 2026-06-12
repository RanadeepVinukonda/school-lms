import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';

interface ConceptNode {
  id: string;
  title: string;
  summary?: string;
  notes?: string;
  videos?: { id: string; title: string; youtubeId: string; channelName?: string; duration?: string }[];
  questionBank?: any[];
  difficulty?: string;
  learningObjectives?: string[];
  keywords?: string[];
}

interface ConceptMindMapProps {
  concepts: ConceptNode[];
  chapterTitle?: string;
  onSelectConcept?: (conceptId: string) => void;
  selectedConceptId?: string;
}

type LayoutNode = ConceptNode & {
  x: number;
  y: number;
  connections: string[];
};

function radialLayout(concepts: ConceptNode[], centerX: number, centerY: number, radius: number): LayoutNode[] {
  return concepts.map((c, i) => {
    const angle = (2 * Math.PI * i) / concepts.length - Math.PI / 2;
    const prereqIds = (c as any).prerequisites
      ? (c as any).prerequisites
          .map((p: string) => concepts.find((o) => o.title.toLowerCase() === p.toLowerCase())?.id)
          .filter(Boolean)
      : [];
    return {
      ...c,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      connections: prereqIds as string[],
    };
  });
}

export function ConceptMindMap({ concepts, chapterTitle, onSelectConcept, selectedConceptId }: ConceptMindMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(selectedConceptId ?? null);

  const centerX = 400;
  const centerY = 250;
  const radius = 180;
  const layoutNodes = useMemo(() => radialLayout(concepts, centerX, centerY, radius), [concepts]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectConcept?.(id);
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="p-4">
            {chapterTitle && (
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Icon name="account_tree" size={16} className="text-primary" />
                {chapterTitle} — Concept Map
              </h3>
            )}
            <svg viewBox="0 0 800 500" className="w-full h-auto max-h-[500px]">
              {/* Connection lines */}
              {layoutNodes.map((node) =>
                node.connections.map((targetId) => {
                  const target = layoutNodes.find((n) => n.id === targetId);
                  if (!target) return null;
                  const active = hoveredId === node.id || hoveredId === target.id;
                  return (
                    <line
                      key={`${node.id}-${targetId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={active ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                      strokeWidth={active ? 2 : 1}
                      strokeOpacity={active ? 0.6 : 0.3}
                      strokeDasharray={active ? 'none' : '6 3'}
                    />
                  );
                })
              )}

              {/* Center node (chapter) */}
              <circle cx={centerX} cy={centerY} r={40} fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth={2} />
              <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary))" fontSize={12} fontWeight="bold" className="select-none">
                {(chapterTitle || 'Chapter').split(' ').slice(0, 2).join('\n')}
              </text>

              {/* Concept nodes */}
              {layoutNodes.map((node, i) => {
                const isSelected = selectedId === node.id;
                const isHovered = hoveredId === node.id;
                const fill = isSelected ? 'hsl(var(--primary))' : isHovered ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--background))';
                const stroke = isSelected ? 'hsl(var(--primary))' : isHovered ? 'hsl(var(--primary))' : 'hsl(var(--border))';
                const textFill = isSelected ? 'white' : 'hsl(var(--foreground))';
                const label = node.title.length > 20 ? node.title.slice(0, 18) + '…' : node.title;

                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleSelect(node.id)}
                    className="cursor-pointer"
                  >
                    <circle cx={node.x} cy={node.y} r={32} fill={fill} stroke={stroke} strokeWidth={isSelected ? 3 : 1.5} />
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={textFill}
                      fontSize={10}
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="select-none pointer-events-none"
                    >
                      {label}
                    </text>
                    {/* Mini indicators */}
                    {node.videos && node.videos.length > 0 && (
                      <g transform={`translate(${node.x + 24}, ${node.y - 24})`}>
                        <circle r={10} fill="hsl(var(--primary))" />
                        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={8}>▶</text>
                      </g>
                    )}
                    {node.questionBank && node.questionBank.length > 0 && (
                      <g transform={`translate(${node.x + 24}, ${node.y + 24})`}>
                        <circle r={10} fill="hsl(var(--secondary))" />
                        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={8}>?</text>
                      </g>
                    )}
                    <text
                      x={node.x}
                      y={node.y + 44}
                      textAnchor="middle"
                      fill="hsl(var(--muted-foreground))"
                      fontSize={8}
                      className="select-none"
                    >
                      {node.videos?.length || 0} vid · {node.questionBank?.length || 0} q
                    </text>
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>
      </div>

      {/* Selected concept detail panel */}
      <div className="lg:col-span-1">
        {selected ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1">{selected.title}</h3>
                {selected.difficulty && <Badge variant="outline" className="text-[10px] capitalize mb-2">{selected.difficulty}</Badge>}
                <p className="text-xs text-muted-foreground leading-relaxed">{selected.summary || 'No summary'}</p>
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
