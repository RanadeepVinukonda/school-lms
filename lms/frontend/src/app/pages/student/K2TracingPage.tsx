import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { prePrimaryService } from '@/services/prePrimaryService';

const tracingOptions = [
  { label: 'A', type: 'letter' },
  { label: 'B', type: 'letter' },
  { label: 'C', type: 'letter' },
  { label: '1', type: 'number' },
  { label: '2', type: 'number' },
  { label: '3', type: 'number' },
  { label: 'Circle', type: 'shape' },
  { label: 'Square', type: 'shape' },
  { label: 'Triangle', type: 'shape' },
];

const COLORS = ['#000000', '#FF0000', '#0000FF', '#00AA00', '#FF8800', '#8800FF', '#FF00FF', '#00AAAA'];

export default function K2TracingPage() {
  const user = useAuthStore((s) => s.user);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [mode, setMode] = useState<'free' | 'guide'>('free');
  const [selectedGuide, setSelectedGuide] = useState('A');
  const [savedCount, setSavedCount] = useState(0);

  const getCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }, []);

  useEffect(() => {
    const { canvas, ctx } = getCanvas() || {};
    if (!canvas || !ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    if (mode === 'guide') {
      drawGuideShape(ctx, canvas, selectedGuide);
    }
  }, [mode, selectedGuide, color, brushSize, getCanvas]);

  const drawGuideShape = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, guide: string) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (guide === 'Circle') {
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.stroke();
    } else if (guide === 'Square') {
      ctx.strokeRect(cx - 60, cy - 60, 120, 120);
    } else if (guide === 'Triangle') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 70);
      ctx.lineTo(cx + 70, cy + 50);
      ctx.lineTo(cx - 70, cy + 50);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.font = '150px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(guide, cx, cy);
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
    }
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { ctx } = getCanvas() || {};
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { ctx } = getCanvas() || {};
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { ctx } = getCanvas() || {};
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const { canvas, ctx } = getCanvas() || {};
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode === 'guide') {
      drawGuideShape(ctx, canvas, selectedGuide);
    }
  };

  const saveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !user) return;
    const content = canvas.toDataURL();
    try {
      await prePrimaryService.saveTracing({
        studentId: user.id,
        content,
        type: mode === 'guide' ? selectedGuide : 'free',
        label: mode === 'guide' ? selectedGuide : 'free-draw',
      });
      setSavedCount((c) => c + 1);
    } catch { }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-4 shadow-lg border-2 border-blue-200">
        <h2 className="text-2xl font-bold text-blue-700 mb-3 flex items-center gap-2">
          <span>✏️</span> Tracing Fun
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('free')}
            className={`px-6 py-3 rounded-2xl text-lg font-bold transition-all ${mode === 'free' ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600'}`}
          >
            🎨 Free Draw
          </button>
          <button
            onClick={() => setMode('guide')}
            className={`px-6 py-3 rounded-2xl text-lg font-bold transition-all ${mode === 'guide' ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600'}`}
          >
            📝 Trace
          </button>
        </div>

        {mode === 'guide' && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tracingOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setSelectedGuide(opt.label)}
                className={`px-5 py-2 rounded-2xl text-lg font-bold transition-all ${
                  selectedGuide === opt.label ? 'bg-purple-500 text-white shadow-lg scale-105' : 'bg-purple-100 text-purple-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-3 flex-wrap items-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-125 shadow-md' : 'border-gray-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <span className="text-sm text-gray-500 ml-2">Size:</span>
          <input
            type="range"
            min="2"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24"
          />
        </div>

        <div className="relative bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full h-auto touch-none"
            style={{ maxHeight: '60vh' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={clearCanvas} className="flex-1 px-6 py-3 bg-red-100 text-red-600 rounded-2xl text-lg font-bold hover:bg-red-200 transition-colors">
            🗑️ Clear
          </button>
          <button onClick={saveCanvas} className="flex-1 px-6 py-3 bg-green-100 text-green-600 rounded-2xl text-lg font-bold hover:bg-green-200 transition-colors">
            💾 Save
          </button>
        </div>

        {savedCount > 0 && (
          <p className="text-center text-green-500 font-bold mt-2">Saved {savedCount} drawing{savedCount > 1 ? 's' : ''}! ⭐</p>
        )}
      </div>
    </div>
  );
}
