import { useState } from 'react';

interface Organelle {
  id: string;
  name: string;
  description: string;
  function: string;
  path: string;
  color: string;
  labelX: number;
  labelY: number;
  plantOnly?: boolean;
  animalOnly?: boolean;
}

const ANIMAL_CELL_ORGANELLES: Organelle[] = [
  { id: 'nucleus', name: 'Nucleus', description: 'The control center of the cell containing DNA.', function: 'Stores genetic material and controls cell activities.', path: 'M250,145 C265,130 290,130 300,145 C310,160 305,180 290,190 C275,200 250,195 240,185 C230,175 230,155 250,145 Z', color: '#7E57C2', labelX: 310, labelY: 165 },
  { id: 'nucleolus', name: 'Nucleolus', description: 'A small dense region inside the nucleus.', function: 'Produces ribosomes by assembling rRNA.', path: 'M260,152 C270,147 280,150 282,158 C284,166 275,172 265,168 C255,164 253,155 260,152 Z', color: '#5C6BC0', labelX: 295, labelY: 175 },
  { id: 'mitochondria', name: 'Mitochondria', description: 'The powerhouse of the cell.', function: 'Generates ATP through cellular respiration.', path: 'M330,200 C345,190 370,195 375,210 C380,225 365,240 350,235 C335,230 325,215 330,200 Z', color: '#EF5350', labelX: 385, labelY: 218 },
  { id: 'golgi', name: 'Golgi Apparatus', description: 'Stack of membrane-bound sacs.', function: 'Modifies, sorts, and packages proteins.', path: 'M170,190 C180,180 200,180 205,190 C210,200 205,215 195,220 C185,225 165,220 165,205 C165,195 165,195 170,190 Z', color: '#FFA726', labelX: 155, labelY: 205 },
  { id: 'er', name: 'Endoplasmic Reticulum', description: 'Network of membranes near the nucleus.', function: 'Synthesizes proteins and lipids.', path: 'M210,120 C220,115 240,118 245,128 C250,138 240,145 230,145 C220,145 215,135 210,120 Z', color: '#42A5F5', labelX: 255, labelY: 130 },
  { id: 'ribosomes', name: 'Ribosomes', description: 'Small particles found throughout the cell.', function: 'Synthesize proteins by translating mRNA.', path: 'M160,150 C163,147 167,147 168,150 C169,153 166,156 163,156 C160,156 158,153 160,150 Z', color: '#26A69A', labelX: 178, labelY: 153 },
  { id: 'lysosome', name: 'Lysosome', description: 'Small vesicle containing digestive enzymes.', function: 'Breaks down waste materials and cellular debris.', path: 'M320,130 C328,126 336,130 334,138 C332,146 324,148 318,143 C312,138 314,133 320,130 Z', color: '#EC407A', labelX: 346, labelY: 137 },
  { id: 'cell_membrane', name: 'Cell Membrane', description: 'The outer boundary of the cell.', function: 'Controls what enters and exits the cell.', path: 'M150,150 C150,100 200,80 250,80 C300,80 350,100 350,150 C350,200 300,220 250,220 C200,220 150,200 150,150 Z', color: '#78909C', labelX: 250, labelY: 235 },
];

const PLANT_CELL_ORGANELLES: Organelle[] = [
  ...ANIMAL_CELL_ORGANELLES.filter((o) => !o.animalOnly).map((o) => o.id === 'cell_membrane' ? { ...o, path: 'M150,130 C150,80 200,60 250,60 C300,60 350,80 350,130 C350,180 300,200 250,200 C200,200 150,180 150,130 Z' } : o),
  { id: 'cell_wall', name: 'Cell Wall', description: 'Rigid outer layer surrounding the cell membrane.', function: 'Provides structural support and protection.', path: 'M150,135 C150,75 200,55 250,55 C300,55 350,75 350,135 C350,195 300,215 250,215 C200,215 150,195 150,135 Z', color: '#8D6E63', labelX: 250, labelY: 245, plantOnly: true },
  { id: 'chloroplast', name: 'Chloroplast', description: 'Green organelle containing chlorophyll.', function: 'Converts light energy into glucose via photosynthesis.', path: 'M180,170 C188,160 202,162 206,172 C210,182 204,194 194,196 C184,198 174,188 180,170 Z', color: '#66BB6A', labelX: 165, labelY: 185, plantOnly: true },
  { id: 'vacuole_plant', name: 'Central Vacuole', description: 'Large fluid-filled sac occupying most of the cell.', function: 'Stores water, maintains turgor pressure, and regulates pH.', path: 'M220,120 C240,110 280,110 290,125 C300,140 295,170 280,180 C265,190 225,188 215,175 C205,162 205,135 220,120 Z', color: '#90CAF9', labelX: 305, labelY: 150, plantOnly: true },
];

interface ClickedOrganelle {
  name: string;
  description: string;
  function: string;
}

export default function CellExplorer() {
  const [cellType, setCellType] = useState<'animal' | 'plant'>('animal');
  const [clicked, setClicked] = useState<ClickedOrganelle | null>(null);

  const organelles = cellType === 'animal' ? ANIMAL_CELL_ORGANELLES : PLANT_CELL_ORGANELLES;

  const handleClick = (o: Organelle) => {
    setClicked({ name: o.name, description: o.description, function: o.function });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => { setCellType('animal'); setClicked(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cellType === 'animal' ? 'bg-primary text-primary-foreground' : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}
          >
            🐾 Animal Cell
          </button>
          <button
            onClick={() => { setCellType('plant'); setClicked(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cellType === 'plant' ? 'bg-primary text-primary-foreground' : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-variant'}`}
          >
            🌱 Plant Cell
          </button>
        </div>
        <p className="text-label-sm text-on-surface-variant">Click on organelles to learn more</p>
      </div>

      <div className="relative border border-outline-variant rounded-xl bg-[#F9FAFB] overflow-hidden">
        <svg width="100%" height="400" viewBox="0 0 500 300" className="block">
          <rect width="500" height="300" fill="#F9FAFB" />

          {cellType === 'plant' && (
            <ellipse cx={250} cy={145} rx={120} ry={85} fill="#FFF8E1" stroke="#8D6E63" strokeWidth={3} opacity={0.3} />
          )}

          {organelles.map((o) => (
            <g key={o.id} onClick={() => handleClick(o)} style={{ cursor: 'pointer' }}>
              <path d={o.path} fill={o.color} fillOpacity={0.35} stroke={o.color} strokeWidth={1.5} className="hover:fill-opacity-60 transition-all" />
              <text x={o.labelX} y={o.labelY} fontSize={8} fill={o.color} fontWeight="bold" textAnchor={o.labelX > 250 ? 'start' : 'end'}>{o.name}</text>
            </g>
          ))}

          {cellType === 'animal' && (
            <path d="M150,150 C150,100 200,80 250,80 C300,80 350,100 350,150 C350,200 300,220 250,220 C200,220 150,200 150,150 Z" fill="none" stroke="#78909C" strokeWidth={2} strokeDasharray="4,3" opacity={0.5} />
          )}

          {clicked && (
            <rect x={10} y={10} width={300} height={70} rx={8} fill="white" stroke="#E0E0E0" strokeWidth={1} opacity={0.95} />
          )}
        </svg>

        {clicked && (
          <div className="absolute top-3 left-3 right-3 bg-white border border-outline-variant rounded-lg p-3 shadow-lg max-w-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-bold text-on-surface">{clicked.name}</p>
              <button onClick={() => setClicked(null)} className="text-on-surface-variant hover:text-on-surface">
                ✕
              </button>
            </div>
            <p className="text-label-sm text-on-surface-variant mt-1">{clicked.description}</p>
            <p className="text-label-xs text-primary mt-1 font-medium">{clicked.function}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {organelles.map((o) => (
          <button
            key={o.id}
            onClick={() => handleClick(o)}
            className="px-2 py-2 rounded-lg border border-outline-variant bg-surface hover:bg-surface-variant text-left transition-colors"
            style={{ borderLeftColor: o.color, borderLeftWidth: 3 }}
          >
            <p className="text-label-sm font-medium text-on-surface truncate">{o.name}</p>
            <p className="text-label-xs text-on-surface-variant truncate">{o.function}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
