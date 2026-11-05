import { useState, useRef, useEffect } from 'react';

interface Reactant {
  id: string;
  name: string;
  formula: string;
  color: string;
  state: 'solid' | 'liquid' | 'gas' | 'aqueous';
}

interface Reaction {
  id: string;
  name: string;
  equation: string;
  description: string;
  reactants: string[];
  products: string;
  productColor: string;
  bubbles: boolean;
  precipitate: boolean;
  colorChange: boolean;
  exothermic: boolean;
}

const REACTIONS: Reaction[] = [
  { id: 'acid_base', name: 'Acid-Base Neutralization', equation: 'HCl + NaOH → NaCl + H₂O', description: 'Hydrochloric acid reacts with sodium hydroxide to form salt and water. The solution neutralizes.', reactants: ['hcl', 'naoh'], products: 'NaCl (aq) + H₂O (l)', productColor: '#E8F5E9', bubbles: false, precipitate: false, colorChange: true, exothermic: true },
  { id: 'combustion', name: 'Methane Combustion', equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O', description: 'Methane burns in oxygen producing carbon dioxide and water vapor with a blue flame.', reactants: ['ch4', 'o2'], products: 'CO₂ (g) + 2H₂O (g)', productColor: '#FFF3E0', bubbles: true, precipitate: false, colorChange: true, exothermic: true },
  { id: 'precipitation', name: 'Silver Chloride Precipitation', equation: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃', description: 'Silver nitrate reacts with sodium chloride to form a white precipitate of silver chloride.', reactants: ['agno3', 'nacl'], products: 'AgCl↓ (s) + NaNO₃ (aq)', productColor: '#F5F5F5', bubbles: false, precipitate: true, colorChange: true, exothermic: false },
  { id: 'redox', name: 'Iron-Copper Displacement', equation: 'Fe + CuSO₄ → FeSO₄ + Cu', description: 'Iron displaces copper from copper sulfate solution. The blue solution turns greenish.', reactants: ['fe', 'cuso4'], products: 'FeSO₄ (aq) + Cu (s)', productColor: '#C8E6C9', bubbles: true, precipitate: false, colorChange: true, exothermic: true },
];

const REACTANTS: Record<string, Reactant> = {
  hcl: { id: 'hcl', name: 'Hydrochloric Acid', formula: 'HCl', color: '#BBDEFB', state: 'aqueous' },
  naoh: { id: 'naoh', name: 'Sodium Hydroxide', formula: 'NaOH', color: '#C8E6C9', state: 'aqueous' },
  ch4: { id: 'ch4', name: 'Methane', formula: 'CH₄', color: '#FFE0B2', state: 'gas' },
  o2: { id: 'o2', name: 'Oxygen', formula: 'O₂', color: '#E1F5FE', state: 'gas' },
  agno3: { id: 'agno3', name: 'Silver Nitrate', formula: 'AgNO₃', color: '#E8EAF6', state: 'aqueous' },
  nacl: { id: 'nacl', name: 'Sodium Chloride', formula: 'NaCl', color: '#F3E5F5', state: 'aqueous' },
  fe: { id: 'fe', name: 'Iron', formula: 'Fe', color: '#FFCCBC', state: 'solid' },
  cuso4: { id: 'cuso4', name: 'Copper Sulfate', formula: 'CuSO₄', color: '#BBDEFB', state: 'aqueous' },
};

interface Molecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  label: string;
  size: number;
}

export default function ReactionLab() {
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [stage, setStage] = useState<'select' | 'reacting' | 'complete'>('select');
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [temperature, setTemperature] = useState(25);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number | null>(null);
  const molIdRef = useRef(0);
  const bubbleIdRef = useRef(0);

  const startReaction = (reaction: Reaction) => {
    setSelectedReaction(reaction);
    setStage('reacting');
    setTemperature(25);

    const mols: Molecule[] = [];
    const rect = svgRef.current?.getBoundingClientRect();
    const w = rect ? rect.width : 500;
    const h = rect ? rect.height : 300;

    reaction.reactants.forEach((rId, idx) => {
      const r = REACTANTS[rId];
      if (!r) return;
      for (let i = 0; i < 5; i++) {
        mols.push({
          id: molIdRef.current++,
          x: 50 + idx * 200 + Math.random() * 60,
          y: 50 + Math.random() * (h - 100),
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: r.color,
          label: r.formula,
          size: 18 + Math.random() * 8,
        });
      }
    });
    setMolecules(mols);
    setBgColor('#FFFFFF');
    setBubbles([]);
  };

  useEffect(() => {
    if (stage !== 'reacting' || !selectedReaction) return;

    const rect = svgRef.current?.getBoundingClientRect();
    const w = rect ? rect.width : 500;
    const h = rect ? rect.height : 300;
    let progress = 0;

    const animate = () => {
      progress += 0.005;
      setMolecules((prev) => {
        const newMols = prev.map((m) => {
          let { x, y, vx, vy } = m;
          x += vx;
          y += vy;

          if (x < 10 || x > w - 10) vx *= -1;
          if (y < 10 || y > h - 10) vy *= -1;

          return { ...m, x: Math.max(10, Math.min(w - 10, x)), y: Math.max(10, Math.min(h - 10, y)), vx, vy };
        });

        if (progress > 0.3 && progress < 0.8) {
          for (let i = newMols.length - 1; i >= 0; i--) {
            if (Math.random() < 0.02) {
              newMols.splice(i, 1);
            }
          }
        }

        return newMols;
      });

      setTemperature((t) => Math.min(t + (selectedReaction.exothermic ? 0.5 : -0.1), selectedReaction.exothermic ? 65 : 25));

      if (selectedReaction.colorChange) {
        setBgColor((prev) => {
          const target = selectedReaction.productColor;
          return target;
        });
      }

      if (selectedReaction.bubbles && Math.random() < 0.1) {
        setBubbles((prev) => [
          ...prev,
          { id: bubbleIdRef.current++, x: 50 + Math.random() * (w - 100), y: h - 10, size: 3 + Math.random() * 6 },
        ]);
      }

      if (progress > 1.5) {
        setStage('complete');
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [stage, selectedReaction]);

  useEffect(() => {
    if (stage !== 'complete' || !bubbles.length) return;
    const interval = setInterval(() => {
      setBubbles((prev) => prev.map((b) => ({ ...b, y: b.y - 1.5 })).filter((b) => b.y > -20));
    }, 50);
    return () => clearInterval(interval);
  }, [stage, bubbles.length]);

  const reset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setSelectedReaction(null);
    setStage('select');
    setMolecules([]);
    setBgColor('#FFFFFF');
    setBubbles([]);
    setTemperature(25);
  };

  return (
    <div className="space-y-4">
      {stage === 'select' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => startReaction(r)}
              className="p-4 rounded-xl border border-outline-variant bg-surface hover:bg-surface-variant text-left transition-all hover:shadow-md"
            >
              <p className="text-sm font-semibold text-on-surface">{r.name}</p>
              <p className="text-label-sm text-on-surface-variant mt-1">{r.equation}</p>
              <p className="text-label-xs text-on-surface-variant mt-1 line-clamp-2">{r.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-on-surface">{selectedReaction?.name}</p>
              <p className="text-label-sm text-on-surface-variant">{selectedReaction?.equation}</p>
            </div>
            <button onClick={reset} className="px-3 py-1.5 text-sm rounded-lg border border-outline-variant hover:bg-surface-variant">
              Reset
            </button>
          </div>

          <div className="relative border border-outline-variant rounded-xl overflow-hidden" style={{ backgroundColor: bgColor, transition: 'background-color 0.5s ease' }}>
            <svg ref={svgRef} width="100%" height="300" viewBox="0 0 500 300" className="block">
              <rect width="500" height="300" fill="transparent" />

              <text x={250} y={20} textAnchor="middle" fontSize={11} fill="#666">
                {stage === 'reacting' ? '⚗️ Reaction in progress...' : '✅ Reaction complete!'}
              </text>

              {molecules.map((m) => (
                <g key={m.id}>
                  <circle cx={m.x} cy={m.y} r={m.size / 2} fill={m.color} stroke="#999" strokeWidth={0.5} opacity={0.85} />
                  <text x={m.x} y={m.y + 3} textAnchor="middle" fontSize={7} fill="#333" fontWeight="bold">{m.label}</text>
                </g>
              ))}

              {bubbles.map((b) => (
                <circle key={b.id} cx={b.x} cy={b.y} r={b.size} fill="none" stroke="#90CAF9" strokeWidth={1} opacity={0.6} />
              ))}
            </svg>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
              <p className="text-label-sm text-on-surface-variant">Temperature</p>
              <p className="text-title-md font-bold text-on-surface">{temperature.toFixed(1)}°C</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
              <p className="text-label-sm text-on-surface-variant">Products</p>
              <p className="text-title-sm font-bold text-primary">{selectedReaction?.products || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
              <p className="text-label-sm text-on-surface-variant">Type</p>
              <p className="text-title-sm font-bold text-on-surface">
                {selectedReaction?.exothermic ? '🔥 Exothermic' : '❄️ Endothermic'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
              <p className="text-label-sm text-on-surface-variant">Status</p>
              <p className={`text-title-sm font-bold ${stage === 'complete' ? 'text-green-600' : 'text-amber-600'}`}>
                {stage === 'complete' ? 'Complete' : 'Reacting'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
