import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import type { MindMapNode, MindMapEdge } from '@/types/mindmap';

interface MindMapBuilderProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  onChange: (nodes: MindMapNode[], edges: MindMapEdge[]) => void;
  readOnly?: boolean;
}

const NODE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6'];

function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ConnectState {
  sourceId: string;
  mouseX: number;
  mouseY: number;
}

export function MindMapBuilder({ nodes, edges, onChange, readOnly = false }: MindMapBuilderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [connect, setConnect] = useState<ConnectState | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ nodeId?: string; x: number; y: number } | null>(null);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'svg') {
      setSelectedNode(null);
      setContextMenu(null);
      setEditingNode(null);
    }
  }, []);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'svg') {
      const rect = svgRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      const newNode: MindMapNode = {
        id: generateId(),
        label: 'New Node',
        type: 'custom',
        x,
        y,
        color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
      };
      onChange([...nodes, newNode], edges);
    }
  }, [nodes, edges, onChange, zoom, pan]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    setSelectedNode(nodeId);
    setContextMenu(null);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setDrag({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: (e.clientX - rect.left - pan.x) / zoom - node.x,
      offsetY: (e.clientY - rect.top - pan.y) / zoom - node.y,
    });
  }, [nodes, readOnly, zoom, pan]);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setEditingNode(nodeId);
    setEditLabel(node.label);
  }, [nodes, readOnly]);

  const handleConnectStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (readOnly) return;
    e.stopPropagation();
    const rect = svgRef.current!.getBoundingClientRect();
    setConnect({
      sourceId: nodeId,
      mouseX: (e.clientX - rect.left - pan.x) / zoom,
      mouseY: (e.clientY - rect.top - pan.y) / zoom,
    });
  }, [readOnly, zoom, pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();

    if (drag) {
      const newX = (e.clientX - rect.left - pan.x) / zoom - drag.offsetX;
      const newY = (e.clientY - rect.top - pan.y) / zoom - drag.offsetY;
      const updated = nodes.map((n) =>
        n.id === drag.nodeId ? { ...n, x: newX, y: newY } : n,
      );
      onChange(updated, edges);
    }

    if (connect) {
      setConnect({
        ...connect,
        mouseX: (e.clientX - rect.left - pan.x) / zoom,
        mouseY: (e.clientY - rect.top - pan.y) / zoom,
      });
    }
  }, [drag, connect, nodes, edges, onChange, zoom, pan]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (connect) {
      const targetNode = nodes.find((n) => {
        const dx = (e.clientX - (svgRef.current!.getBoundingClientRect().left)) / zoom - pan.x / zoom - n.x;
        const dy = (e.clientY - (svgRef.current!.getBoundingClientRect().top)) / zoom - pan.y / zoom - n.y;
        return Math.sqrt(dx * dx + dy * dy) < 40;
      });
      if (targetNode && targetNode.id !== connect.sourceId) {
        const existingEdge = edges.find(
          (ed) => ed.source === connect.sourceId && ed.target === targetNode.id,
        );
        if (!existingEdge) {
          const newEdge: MindMapEdge = {
            id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: connect.sourceId,
            target: targetNode.id,
          };
          onChange(nodes, [...edges, newEdge]);
        }
      }
      setConnect(null);
    }
    setDrag(null);
  }, [connect, nodes, edges, onChange, zoom, pan]);

  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId?: string) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ nodeId, x: e.clientX, y: e.clientY });
  }, [readOnly]);

  const deleteNode = useCallback((nodeId: string) => {
    onChange(
      nodes.filter((n) => n.id !== nodeId),
      edges.filter((ed) => ed.source !== nodeId && ed.target !== nodeId),
    );
    setContextMenu(null);
    setSelectedNode(null);
  }, [nodes, edges, onChange]);

  const deleteEdge = useCallback((edgeId: string) => {
    onChange(nodes, edges.filter((ed) => ed.id !== edgeId));
    setContextMenu(null);
  }, [nodes, edges, onChange]);

  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    const updated = nodes.map((n) => (n.id === nodeId ? { ...n, label } : n));
    onChange(updated, edges);
    setEditingNode(null);
  }, [nodes, edges, onChange]);

  const updateNodeColor = useCallback((nodeId: string, color: string) => {
    const updated = nodes.map((n) => (n.id === nodeId ? { ...n, color } : n));
    onChange(updated, edges);
  }, [nodes, edges, onChange]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.1, 3)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.1, 0.3)), []);
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const autoLayout = useCallback(() => {
    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    const newNodes = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      return {
        ...n,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    onChange(newNodes, edges);
  }, [nodes, edges, onChange]);

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-2">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={zoomIn} title="Zoom in">
              <Icon name="add" size={18} />
            </Button>
            <span className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon-sm" onClick={zoomOut} title="Zoom out">
              <Icon name="remove" size={18} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={resetZoom} title="Reset view">
              <Icon name="center_focus_strong" size={18} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={autoLayout} className="gap-1 text-xs">
                <Icon name="auto_fix_high" size={14} />
                Auto-layout
              </Button>
            )}
            {!readOnly && (
              <Button variant="ghost" size="sm" onClick={() => {
                const newNode: MindMapNode = {
                  id: generateId(),
                  label: 'New Node',
                  type: 'custom',
                  x: 300 + Math.random() * 100,
                  y: 200 + Math.random() * 100,
                  color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
                };
                onChange([...nodes, newNode], edges);
              }} className="gap-1 text-xs">
                <Icon name="add_circle" size={14} />
                Add Node
              </Button>
            )}
          </div>
        </div>
        <div className="relative border rounded-lg overflow-hidden bg-dot-muted" style={{ minHeight: 500 }}>
          <svg
            ref={svgRef}
            className="w-full cursor-default"
            style={{ minHeight: 500 }}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onContextMenu={(e) => handleContextMenu(e)}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {edges.map((edge) => {
                const source = getNode(edge.source);
                const target = getNode(edge.target);
                if (!source || !target) return null;
                return (
                  <g key={edge.id}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    {edge.label && (
                      <text
                        x={(source.x + target.x) / 2}
                        y={(source.y + target.y) / 2 - 8}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize={10}
                        className="select-none"
                      >
                        {edge.label}
                      </text>
                    )}
                    {!readOnly && (
                      <rect
                        x={(source.x + target.x) / 2 + 10}
                        y={(source.y + target.y) / 2 - 8}
                        width={16}
                        height={16}
                        rx={4}
                        fill="#ef4444"
                        className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEdge(edge.id);
                        }}
                      />
                    )}
                  </g>
                );
              })}
              {connect && edges.map((edge) => {
                if (edge.source !== connect.sourceId) return null;
                const source = getNode(edge.source);
                if (!source) return null;
                return null;
              })}
              {connect && (() => {
                const source = getNode(connect.sourceId);
                if (!source) return null;
                return (
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={connect.mouseX}
                    y2={connect.mouseY}
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                  />
                );
              })()}
              {nodes.map((node) => {
                const isSelected = selectedNode === node.id;
                const isEditing = editingNode === node.id;
                return (
                  <g
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
                    onContextMenu={(e) => handleContextMenu(e, node.id)}
                    className={!readOnly ? 'cursor-grab active:cursor-grabbing' : ''}
                  >
                    {!readOnly && (
                      <circle
                        cx={node.x}
                        cy={node.y - 28}
                        r={10}
                        fill="#6366f1"
                        className="cursor-crosshair"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleConnectStart(e, node.id);
                        }}
                      />
                    )}
                    <rect
                      x={node.x - 60}
                      y={node.y - 20}
                      width={120}
                      height={40}
                      rx={8}
                      fill={node.color || '#6366f1'}
                      fillOpacity={0.15}
                      stroke={isSelected ? node.color || '#6366f1' : '#e2e8f0'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    {isEditing ? (
                      <foreignObject x={node.x - 55} y={node.y - 15} width={110} height={30}>
                        <input
                          autoFocus
                          className="w-full h-full px-1 text-xs font-medium rounded border border-primary outline-none bg-white"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onBlur={() => updateNodeLabel(node.id, editLabel)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateNodeLabel(node.id, editLabel);
                            if (e.key === 'Escape') setEditingNode(null);
                          }}
                        />
                      </foreignObject>
                    ) : (
                      <text
                        x={node.x}
                        y={node.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#1e293b"
                        fontSize={11}
                        fontWeight={600}
                        className="select-none pointer-events-none"
                      >
                        {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
                      </text>
                    )}
                    {node.resourceType && (
                      <g transform={`translate(${node.x + 45}, ${node.y - 12})`}>
                        <circle r={8} fill="#22c55e" />
                        <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={8}>
                          {node.resourceType === 'lesson' ? 'L' : node.resourceType === 'video' ? 'V' : 'C'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
