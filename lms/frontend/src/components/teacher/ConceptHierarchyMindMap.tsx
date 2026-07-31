import { useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas';
import { Icon } from '@/components/ui/Icon';

interface ConceptHierarchyMindMapProps {
  chapterTitle: string;
  concepts: { id: string; title: string }[];
  onSelectConcept?: (conceptId: string) => void;
}

export function ConceptHierarchyMindMap({ chapterTitle, concepts, onSelectConcept }: ConceptHierarchyMindMapProps) {
  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [
      { id: 'chapter', data: { label: chapterTitle || 'Chapter' }, position: { x: 0, y: 0 } },
    ];
    for (const c of concepts) {
      result.push({ id: `concept-${c.id}`, data: { label: c.title }, position: { x: 0, y: 0 } });
    }
    return result;
  }, [chapterTitle, concepts]);

  const edges: Edge[] = useMemo(
    () =>
      concepts.map((c) => ({
        id: `edge-${c.id}`,
        source: 'chapter',
        target: `concept-${c.id}`,
      })),
    [concepts],
  );

  if (concepts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Icon name="account_tree" size={40} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No concepts defined for this chapter yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Icon name="account_tree" size={16} className="text-primary" />
          {chapterTitle || 'Chapter Mind Map'}
        </h3>
        <span className="text-[10px] text-muted-foreground">
          Scroll to zoom &middot; Drag to pan &middot; Click chapter to expand/collapse
        </span>
      </div>
      <MindMapCanvas
        nodes={nodes}
        edges={edges}
        layout="dagre"
        rankdir="TB"
        collapsible
        onNodeClick={(node) => {
          if (node.id.startsWith('concept-')) {
            onSelectConcept?.(node.id.slice('concept-'.length));
          }
        }}
        className="h-[50vh] min-h-[380px] w-full rounded-xl border border-border/40 overflow-hidden bg-muted/10"
      />
    </div>
  );
}
