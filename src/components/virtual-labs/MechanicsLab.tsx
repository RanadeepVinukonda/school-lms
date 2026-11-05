import { useState, useRef, useEffect, useCallback } from 'react';

interface ForceVector {
  x: number;
  y: number;
  label: string;
  color: string;
  magnitude: number;
}

export default function MechanicsLab() {
  const [angle, setAngle] = useState(30);
  const [mass, setMass] = useState(5);
  const [frictionCoeff, setFrictionCoeff] = useState(0.2);
  const [isRunning, setIsRunning] = useState(false);
  const [position, setPosition] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showForces, setShowForces] = useState(true);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const g = 9.81;
  const radians = (angle * Math.PI) / 180;
  const gravityForce = mass * g;
  const normalForce = mass * g * Math.cos(radians);
  const parallelForce = mass * g * Math.sin(radians);
  const frictionForce = frictionCoeff * normalForce;
  const netForce = parallelForce - frictionForce;
  const calcAcceleration = netForce / mass;

  const forces: ForceVector[] = [
    { x: 0, y: -gravityForce / 20, label: `Gravity ${gravityForce.toFixed(1)}N`, color: '#F44336', magnitude: gravityForce },
    { x: 0, y: normalForce / 20, label: `Normal ${normalForce.toFixed(1)}N`, color: '#2196F3', magnitude: normalForce },
    { x: -parallelForce / 20, y: 0, label: `Parallel ${parallelForce.toFixed(1)}N`, color: '#FF9800', magnitude: parallelForce },
    { x: frictionForce / 20, y: 0, label: `Friction ${frictionForce.toFixed(1)}N`, color: '#9C27B0', magnitude: frictionForce },
  ];

  useEffect(() => {
    setAcceleration(calcAcceleration);
  }, [calcAcceleration]);

  const reset = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsRunning(false);
    setPosition(0);
    setVelocity(0);
    setElapsedTime(0);
    lastTimeRef.current = 0;
  }, []);

  const startSimulation = useCallback(() => {
    if (calcAcceleration <= 0) return;
    reset();
    setIsRunning(true);
    lastTimeRef.current = performance.now();
  }, [calcAcceleration, reset]);

  useEffect(() => {
    if (!isRunning) return;
    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      setVelocity((v) => {
        const newV = v + calcAcceleration * dt;
        return Math.max(0, newV);
      });
      setElapsedTime((t) => t + dt);
      setPosition((p) => {
        const newP = p + velocity * dt + 0.5 * calcAcceleration * dt * dt;
        if (newP >= 280) {
          setIsRunning(false);
          return 280;
        }
        return newP;
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isRunning, calcAcceleration, velocity]);

  const planeEndX = 150 + 280 * Math.cos(radians);
  const planeEndY = 250 - 280 * Math.sin(radians);
  const objectX = 150 + position * Math.cos(radians);
  const objectY = 250 - position * Math.sin(radians);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-label-sm text-on-surface-variant">Angle ({angle}°)</label>
          <input type="range" min={5} max={80} value={angle} onChange={(e) => { setAngle(Number(e.target.value)); reset(); }} className="w-full" />
        </div>
        <div>
          <label className="text-label-sm text-on-surface-variant">Mass ({mass} kg)</label>
          <input type="range" min={1} max={20} step={0.5} value={mass} onChange={(e) => { setMass(Number(e.target.value)); reset(); }} className="w-full" />
        </div>
        <div>
          <label className="text-label-sm text-on-surface-variant">Friction μ ({frictionCoeff.toFixed(2)})</label>
          <input type="range" min={0} max={0.8} step={0.02} value={frictionCoeff} onChange={(e) => { setFrictionCoeff(Number(e.target.value)); reset(); }} className="w-full" />
        </div>
        <div className="flex items-end gap-2">
          <button onClick={startSimulation} disabled={calcAcceleration <= 0} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            {isRunning ? 'Running...' : 'Release'}
          </button>
          <button onClick={reset} className="px-4 py-2 rounded-lg border border-outline-variant text-sm font-medium hover:bg-surface-variant">
            Reset
          </button>
          <button onClick={() => setShowForces(!showForces)} className={`px-3 py-2 rounded-lg text-sm font-medium border ${showForces ? 'bg-primary-container text-on-primary-container' : 'bg-surface text-on-surface-variant'} border-outline-variant`}>
            Forces
          </button>
        </div>
      </div>

      <div className="relative border border-outline-variant rounded-xl bg-[#FAFAFA] overflow-hidden">
        <svg width="100%" height="320" viewBox="0 0 500 320" className="block">
          <rect width="500" height="320" fill="#FAFAFA" />

          <line x1={50} y1={250} x2={planeEndX} y2={planeEndY} stroke="#795548" strokeWidth={4} strokeLinecap="round" />
          <line x1={50} y1={250} x2={50 + 280} y2={250} stroke="#E0E0E0" strokeWidth={1} strokeDasharray="4,4" />
          <text x={50 + 140} y={265} textAnchor="middle" fontSize={10} fill="#999">Ground</text>

          <path d={`M ${50} 250 L ${55} 245 L ${55} 250 Z`} fill="#999" />

          <rect
            x={objectX - 14}
            y={objectY - 14}
            width={28}
            height={28}
            rx={3}
            fill="#4CAF50"
            stroke="#388E3C"
            strokeWidth={1.5}
            transform={`rotate(${-angle}, ${objectX}, ${objectY})`}
          />
          <text x={objectX} y={objectY + 4} textAnchor="middle" fontSize={8} fill="#fff" fontWeight="bold">{mass}kg</text>

          {showForces && position < 280 && (
            <>
              {position < 280 && (
                <g>
                  <line x1={objectX} y1={objectY} x2={objectX} y2={objectY - forces[0].magnitude / 20} stroke={forces[0].color} strokeWidth={2} markerEnd="url(#arrowRed)" />
                  <text x={objectX + 15} y={objectY - forces[0].magnitude / 40} fontSize={9} fill={forces[0].color}>{forces[0].label}</text>
                  <line x1={objectX} y1={objectY} x2={objectX} y2={objectY + forces[1].magnitude / 20} stroke={forces[1].color} strokeWidth={2} markerEnd="url(#arrowBlue)" />
                  <text x={objectX + 15} y={objectY + forces[1].magnitude / 40 + 10} fontSize={9} fill={forces[1].color}>{forces[1].label}</text>
                  <line x1={objectX} y1={objectY} x2={objectX - forces[2].magnitude / 20} y2={objectY} stroke={forces[2].color} strokeWidth={2} markerEnd="url(#arrowOrange)" />
                  <text x={objectX - forces[2].magnitude / 40} y={objectY - 10} fontSize={9} fill={forces[2].color} textAnchor="middle">{forces[2].label}</text>
                  {frictionCoeff > 0 && (
                    <>
                      <line x1={objectX} y1={objectY} x2={objectX + forces[3].magnitude / 20} y2={objectY} stroke={forces[3].color} strokeWidth={2} markerEnd="url(#arrowPurple)" />
                      <text x={objectX + forces[3].magnitude / 40} y={objectY - 10} fontSize={9} fill={forces[3].color} textAnchor="middle">{forces[3].label}</text>
                    </>
                  )}
                </g>
              )}
              <defs>
                <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill={forces[0].color} /></marker>
                <marker id="arrowBlue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill={forces[1].color} /></marker>
                <marker id="arrowOrange" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill={forces[2].color} /></marker>
                <marker id="arrowPurple" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill={forces[3].color} /></marker>
              </defs>
            </>
          )}

          <text x={65 + angle * 1.5} y={245 - angle * 1.5} fontSize={11} fill="#795548">
            {angle}°
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Net Force</p>
          <p className="text-title-md font-bold text-on-surface">{netForce.toFixed(2)} N</p>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Acceleration</p>
          <p className="text-title-md font-bold text-primary">{acceleration.toFixed(2)} m/s²</p>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Velocity</p>
          <p className="text-title-md font-bold text-on-surface">{velocity.toFixed(2)} m/s</p>
        </div>
        <div className="p-3 rounded-lg bg-surface border border-outline-variant text-center">
          <p className="text-label-sm text-on-surface-variant">Time</p>
          <p className="text-title-md font-bold text-on-surface">{elapsedTime.toFixed(2)}s</p>
        </div>
      </div>
    </div>
  );
}
