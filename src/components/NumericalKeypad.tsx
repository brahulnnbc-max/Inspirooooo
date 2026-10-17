import React from 'react';
import { Delete, RotateCcw } from 'lucide-react';

interface NumericalKeypadProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const NumericalKeypad: React.FC<NumericalKeypadProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleDigit = (digit: string) => {
    if (disabled) return;
    // Disallow multiple minus or bad decimal placements
    if (digit === '.' && value.includes('.')) return;
    if (digit === '-' && value.length > 0) return;
    if (value.length >= 12) return;
    onChange(value + digit);
  };

  const handleBackspace = () => {
    if (disabled || !value) return;
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled) return;
    onChange('');
  };

  return (
    <div className="w-full max-w-xs bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl text-white">
      {/* Value Display / Direct Input */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-zinc-400 mb-1">
          Enter Numerical Value:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              // allow numbers, minus, dot
              const val = e.target.value.replace(/[^0-9.-]/g, '');
              onChange(val);
            }}
            placeholder="e.g. 25 or 12.5"
            disabled={disabled}
            className="w-full px-3 py-2 text-base font-mono font-bold tracking-wider text-white bg-black border border-zinc-800 rounded-lg focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
          />
        </div>
      </div>

      {/* Virtual Keypad Matrix */}
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            disabled={disabled}
            className="h-10 text-base font-bold font-mono bg-zinc-900 hover:bg-zinc-800 active:bg-red-600 active:text-white text-white border border-zinc-800 rounded-lg shadow-xs transition-all"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleDigit('.')}
          disabled={disabled}
          className="h-10 text-lg font-bold font-mono bg-zinc-900 hover:bg-zinc-800 active:bg-red-600 active:text-white text-white border border-zinc-800 rounded-lg shadow-xs transition-all"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          disabled={disabled}
          className="h-10 text-base font-bold font-mono bg-zinc-900 hover:bg-zinc-800 active:bg-red-600 active:text-white text-white border border-zinc-800 rounded-lg shadow-xs transition-all"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleDigit('-')}
          disabled={disabled}
          className="h-10 text-base font-bold font-mono bg-zinc-900 hover:bg-zinc-800 active:bg-red-600 active:text-white text-white border border-zinc-800 rounded-lg shadow-xs transition-all"
        >
          -
        </button>
      </div>

      {/* Actions: Backspace & Clear */}
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <button
          type="button"
          onClick={handleBackspace}
          disabled={disabled || !value}
          className="h-9 text-xs font-bold flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 active:scale-95 transition-all disabled:opacity-40"
        >
          <Delete className="w-3.5 h-3.5 text-zinc-400" />
          Backspace
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !value}
          className="h-9 text-xs font-bold flex items-center justify-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/80 rounded-lg active:scale-95 transition-all disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
    </div>
  );
};
