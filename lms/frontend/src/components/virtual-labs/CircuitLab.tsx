import { useState, useCallback, useRef, useEffect } from 'react';

interface CircuitComponent {
  id: string;
  type: 'battery' | 'resistor' | 'bulb' | 'switch' | 'wire';
  x: number;
  y: number;
  label: string;
  connected: boolean;
}

interface Connection {
  from: string;
  to: string;
}

const COMPONENT_TEMPLATES: Omit<CircuitComponent, 'id' | 'x' | 'y'>[] = [
  { type: 'battery', label: 'Battery', connected: false },
  { type: 'resistor', label: 'Resistor', connected: false },
  { type: 'bulb', label: 'Bulb', connected: false },
  { type: 'switch', label: 'Switch', connected: false },
];

const COMPONENT_COLORS: Record<string, string> = {
  battery: '#4CAF50',
  resistor: '#FF9800',
  bulb: '#FFEB3B',
  switch: '#607D8B',
  wire: '#9E9E9E',
};

export default function CircuitLab() {
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [switchClosed, setSwitchClosed] = useState(false);
  const [currentFlow, setCurrentFlow] = useState(false);
  const [voltage, setVoltage] = useState(9);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const addComponent = useCallback((type: CircuitComponent['type']) => {
    const id = `${type}_${Date.now()}`;
    const template = COMPONENT_TEMPLATES.find((c) => c.type === type);
    const newComp: CircuitComponent = {
      id,
      type,
      x: 80 + components.length * 90,
      y: 150,
      label: template?.label || type,
      connected: false,
    };
    setComponents((prev) => [...prev, newComp]);
  }, [components.length]);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const comp = components.find((c) => c.id === id);
    if (!comp) return;
    setDragging(id);
    setDragOffset({
      x: e.clientX - rect.left - comp.x,
      y: e.clientY - rect.top - comp.y,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setComponents((prev) =>
      prev.map((c) =>
        c.id === dragging
          ? { ...c, x: Math.max(10, Math.min(550, e.clientX - rect.left - dragOffset.x)), y: Math.max(10, Math.min(350, e.clientY - rect.top - dragOffset.y)) }
          : c
      )
    );
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const hasBattery = components.some((c) => c.type === 'battery');
    const hasBulb = components.some((c) => c.type === 'bulb');
    const hasSwitch = components.some((c) => c.type === 'switch');
    const isComplete = connections.length >= 2 && hasBattery && hasBulb;
    setCurrentFlow(isComplete && switchClosed && hasSwitch);
  }, [connections, switchClosed, components]);

  const handleTerminalClick = (id: string) => {
    if (selectedTerminal === null) {
      setSelectedTerminal(id);
    } else if (selectedTerminal !== id) {
      setConnections((prev) => [...prev, { from: selectedTerminal, to: id }]);
      setSelectedTerminal(null);
      setComponents((prev) =>
        prev.map((c) =>
          c.id === id || c.id === selectedTerminal ? { ...c, connected: true } : c
        )
      );
    } else {
      setSelectedTerminal(null);
    }
  };

  const renderComponentSVG = (comp: CircuitComponent) => {
    const { type, x, y, id } = comp;
    const color = COMPONENT_COLORS[type];

    switch (type) {
      case 'battery':
        return (
          <g key={id}>
            <rect x={x - 20} y={y - 15} width={40} height={30} rx={4} fill={color} stroke="#333" strokeWidth={1.5} />
            <text x={x} y={y - 20} textAnchor="middle" fontSize={10} fill="#333">+</text>
            <text x={x} y={y + 28} textAnchor="middle" fontSize={10} fill="#333">-</text>
            <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold">{comp.label}</text>
            <circle cx={x - 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
            <circle cx={x + 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
          </g>
        );
      case 'resistor':
        return (
          <g key={id}>
            <rect x={x - 20} y={y - 8} width={40} height={16} rx={2} fill={color} stroke="#333" strokeWidth={1} />
            {[0,1,2,3].map((i) => (
              <line key={i} x1={x - 15 + i * 10} y1={y - 8} x2={x - 10 + i * 10} y2={y + 8} stroke="#333" strokeWidth={1} />
            ))}
            <text x={x} y={y + 4} textAnchor="middle" fontSize={8} fill="#fff">{comp.label}</text>
            <circle cx={x - 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
            <circle cx={x + 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
          </g>
        );
      case 'bulb':
        return (
          <g key={id}>
            <circle cx={x} cy={y} r={18} fill={currentFlow ? '#FFEB3B' : '#FFF9C4'} stroke={color} strokeWidth={2} />
            <circle cx={x} cy={y} r={8} fill={currentFlow ? '#FFC107' : '#FFE082'} />
            <line x1={x - 12} y1={y - 12} x2={x + 12} y2={y + 12} stroke="#333" strokeWidth={0.5} opacity={0.3} />
            <line x1={x + 12} y1={y - 12} x2={x - 12} y2={y + 12} stroke="#333" strokeWidth={0.5} opacity={0.3} />
            <text x={x} y={y - 24} textAnchor="middle" fontSize={9} fill="#333">{comp.label}</text>
            <circle cx={x - 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
            <circle cx={x + 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
          </g>
        );
      case 'switch':
        return (
          <g key={id}>
            <rect x={x - 20} y={y - 10} width={40} height={20} rx={3} fill={color} stroke="#333" strokeWidth={1} />
            <circle cx={x - 12} cy={y} r={4} fill="#444" />
            <line x1={x - 12} y1={y} x2={switchClosed ? x + 12 : x + 8} y2={switchClosed ? y : y - 8} stroke={switchClosed ? '#4CAF50' : '#F44336'} strokeWidth={2.5} />
            <circle cx={x + 12} cy={switchClosed ? y : y} r={4} fill="#444" />
            <text x={x} y={y - 16} textAnchor="middle" fontSize={8} fill="#333">{switchClosed ? 'ON' : 'OFF'}</text>
            <circle cx={x - 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
            <circle cx={x + 20} cy={y} r={4} fill={selectedTerminal === id ? '#FF5722' : '#666'} stroke="#333" strokeWidth={1} onClick={() => handleTerminalClick(id)} style={{ cursor: 'pointer' }} />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['battery', 'resistor', 'bulb', 'switch'].map((type) => (
          <button
            key={type}
            onClick={() => addComponent(type as CircuitComponent['type'])}
            className="px-3 py-1.5 text-sm rounded-lg border border-outline-variant bg-surface hover:bg-surface-variant transition-colors capitalize"
          >
            + {type}
          </button>
        ))}
        <button
          onClick={() => { setComponents([]); setConnections([]); setSwitchClosed(false); setCurrentFlow(false); setSelectedTerminal(null); }}
          className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors ml-auto"
        >
          Clear
        </button>
      </div>

      <div className="relative border border-outline-variant rounded-xl bg-[#FAFAFA] overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="380"
          viewBox="0 0 600 380"
          className="cursor-grab active:cursor-grabbing"
        >
          <rect width="600" height="380" fill="#FAFAFA" />
          <text x={300} y={20} textAnchor="middle" fontSize={13} fill="#888" fontStyle="italic">
            {components.length === 0 ? 'Click buttons above to add circuit components. Drag to move, click terminals (dots) to connect.' : 'Drag components. Click terminal dots to connect wires.'}
          </text>

          {connections.map((conn, i) => {
            const from = components.find((c) => c.id === conn.from);
            const to = components.find((c) => c.id === conn.to);
            if (!from || !to) return null;
            const active = currentFlow;
            return (
              <line
                key={`conn_${i}`}
                x1={from.x + (from.x < to.x ? 20 : -20)}
                y1={from.y}
                x2={to.x + (to.x > from.x ? -20 : 20)}
                y2={to.y}
                stroke={active ? '#4CAF50' : '#9E9E9E'}
                strokeWidth={active ? 3 : 2}
                strokeDasharray={active ? '6,3' : 'none'}
              >
                {active && <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.5s" repeatCount="indefinite" />}
              </line>
            );
          })}

          {components.map((comp) => (
            <g
              key={comp.id}
              onMouseDown={(e) => handleMouseDown(e, comp.id)}
              style={{ cursor: 'move' }}
            >
              {renderComponentSVG(comp)}
            </g>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Voltage</p>
          <p className="text-title-md font-bold text-primary">{voltage}V</p>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Current</p>
          <p className="text-title-md font-bold" style={{ color: currentFlow ? '#4CAF50' : '#999' }}>
            {currentFlow ? `${(voltage / Math.max(components.filter(c => c.type === 'resistor').length, 1)).toFixed(1)}A` : '0A'}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Switch</p>
          <button
            onClick={() => setSwitchClosed(!switchClosed)}
            className={`mt-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${switchClosed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
          >
            {switchClosed ? 'Closed' : 'Open'}
          </button>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Components</p>
          <p className="text-title-md font-bold text-on-surface">{components.length}</p>
        </div>
      </div>
    </div>
  );
}
