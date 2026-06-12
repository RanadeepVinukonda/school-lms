import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import type { Concept } from '@/types/textbook';

interface ConceptDetailMindMapProps {
  concept: Concept;
}

export function ConceptDetailMindMap({ concept }: ConceptDetailMindMapProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'objectives' | 'keywords' | 'videos'>('summary');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const centerX = 400;
  const centerY = 250;

  // Node positions
  const nodes = {
    summary: { x: 180, y: 150, label: 'Summary', icon: 'menu_book', color: 'primary' },
    objectives: { x: 180, y: 350, label: 'Objectives', icon: 'track_changes', color: 'tertiary' },
    keywords: { x: 620, y: 150, label: 'Keywords', icon: 'label', color: 'secondary' },
    videos: { x: 620, y: 350, label: 'Videos', icon: 'smart_display', color: 'error' },
  };

  const currentTabDetails = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Icon name="menu_book" size={18} />
              <h4>Concept Summary</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{concept.summary || 'No summary available.'}</p>
            {concept.notes && (
              <div className="mt-2 border-t pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Detailed Notes</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">{concept.notes}</p>
              </div>
            )}
          </div>
        );
      case 'objectives':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-tertiary font-semibold">
              <Icon name="track_changes" size={18} />
              <h4>Learning Objectives</h4>
            </div>
            {concept.learningObjectives && concept.learningObjectives.length > 0 ? (
              <ul className="space-y-2">
                {concept.learningObjectives.map((obj, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-tertiary mt-0.5">•</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No learning objectives defined.</p>
            )}
          </div>
        );
      case 'keywords':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-secondary font-semibold">
              <Icon name="label" size={18} />
              <h4>Keywords & Key Terms</h4>
            </div>
            {concept.keywords && concept.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {concept.keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No keywords defined.</p>
            )}
          </div>
        );
      case 'videos':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-error font-semibold">
              <Icon name="smart_display" size={18} />
              <h4>Videos & Learning Links</h4>
            </div>
            {concept.videos && concept.videos.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {concept.videos.map((v) => (
                  <div key={v.id} className="flex items-start gap-2 p-2 rounded-lg border bg-surface-variant/20">
                    <Icon name="play_circle" size={18} className="text-error mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{v.title}</p>
                      <p className="text-[10px] text-muted-foreground">{v.channelName} • {v.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (concept as any).videoLinks && (concept as any).videoLinks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Search references:</p>
                {(concept as any).videoLinks.map((link: string, i: number) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Icon name="open_in_new" size={12} />
                    Watch reference on YouTube
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No videos available.</p>
            )}
          </div>
        );
    }
  };

  const conceptTitleLabel = concept.title.length > 25 ? concept.title.slice(0, 22) + '…' : concept.title;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <CardContent className="p-4 relative">
            <svg viewBox="0 0 800 500" className="w-full h-auto max-h-[450px]">
              {/* Branch lines */}
              {Object.entries(nodes).map(([key, node]) => {
                const active = activeTab === key || hoveredNode === key;
                return (
                  <line
                    key={key}
                    x1={centerX}
                    y1={centerY}
                    x2={node.x}
                    y2={node.y}
                    stroke={active ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={active ? 2.5 : 1.5}
                    strokeOpacity={active ? 0.8 : 0.4}
                    strokeDasharray={active ? 'none' : '5 4'}
                    className="transition-all duration-300"
                  />
                );
              })}

              {/* Center Node (Concept Title) */}
              <g transform={`translate(${centerX}, ${centerY})`}>
                <rect
                  x="-90"
                  y="-30"
                  width="180"
                  height="60"
                  rx="15"
                  fill="hsl(var(--primary) / 0.1)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(var(--primary))"
                  fontSize="12"
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {conceptTitleLabel}
                </text>
              </g>

              {/* Branch Nodes */}
              {Object.entries(nodes).map(([key, node]) => {
                const isSelected = activeTab === key;
                const isHovered = hoveredNode === key;
                const fill = isSelected
                  ? 'hsl(var(--primary))'
                  : isHovered
                    ? 'hsl(var(--primary) / 0.15)'
                    : 'hsl(var(--background))';
                const stroke = isSelected
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--border))';
                const textFill = isSelected ? 'white' : 'hsl(var(--foreground))';

                return (
                  <g
                    key={key}
                    onMouseEnter={() => setHoveredNode(key)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setActiveTab(key as any)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="35"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all duration-200"
                    />
                    <g transform={`translate(${node.x}, ${node.y - 8})`}>
                      <Icon
                        name={node.icon}
                        size={20}
                        className={isSelected ? 'text-white' : 'text-muted-foreground'}
                      />
                    </g>
                    <text
                      x={node.x}
                      y={node.y + 16}
                      textAnchor="middle"
                      fill={textFill}
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="select-none pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </CardContent>
        </Card>
      </div>

      {/* Detail Panel */}
      <div className="lg:col-span-1">
        <Card className="h-full min-h-[350px]">
          <CardContent className="p-4">
            {currentTabDetails()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
