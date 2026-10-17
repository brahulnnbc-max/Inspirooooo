import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, PenTool, Eraser } from 'lucide-react';

interface ScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScratchpadModal: React.FC<ScratchpadModalProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#ffffff');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display size and internal coordinate size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl h-[560px] bg-zinc-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-800 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-black">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white text-sm">Virtual Scratchpad / Rough Sheet</span>
            <span className="text-xs text-zinc-400">For rough math & derivations</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Color swatches */}
            <div className="flex items-center gap-1.5 mr-2">
              {[
                { hex: '#ffffff', label: 'White' },
                { hex: '#ef4444', label: 'Red' },
                { hex: '#facc15', label: 'Yellow' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => {
                    setColor(c.hex);
                    setMode('pen');
                  }}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    color === c.hex && mode === 'pen'
                      ? 'ring-2 ring-red-500 scale-110'
                      : 'border-zinc-700 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            {/* Tool controls */}
            <button
              onClick={() => setMode('pen')}
              className={`p-1.5 px-2.5 rounded-lg text-xs flex items-center gap-1.5 font-bold transition-colors ${
                mode === 'pen' ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Pen
            </button>
            <button
              onClick={() => setMode('eraser')}
              className={`p-1.5 px-2.5 rounded-lg text-xs flex items-center gap-1.5 font-bold transition-colors ${
                mode === 'eraser' ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              Eraser
            </button>
            <div className="h-4 w-px bg-zinc-800 mx-1" />
            <button
              onClick={clearCanvas}
              className="p-1.5 px-2 rounded-lg text-xs flex items-center gap-1.5 font-bold text-zinc-400 hover:bg-red-950/60 hover:text-red-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
            <div className="h-4 w-px bg-zinc-800 mx-1" />
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-black relative cursor-crosshair overflow-hidden">
          {/* Subtle grid lines like a dark test rough sheet */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#52525b 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
};
