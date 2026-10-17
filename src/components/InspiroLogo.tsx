import React, { useState } from 'react';
import inspiroLogoAsset from '../assets/images/inspiro_logo.png';

interface InspiroLogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  showText?: boolean;
}

export const InspiroLogo: React.FC<InspiroLogoProps> = ({
  className = '',
  imgClassName = '',
  size = 'md',
  variant = 'dark',
  showText = false,
}) => {
  // Cascading fallbacks so it never fails on Vercel, localhost, or preview deployments
  const candidates = [inspiroLogoAsset, '/inspiro_logo.png', '/logo.png'];
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const handleImgError = () => {
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  const sizeBox = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div
        className={`${sizeBox} rounded-lg overflow-hidden flex items-center justify-center shrink-0 border ${
          variant === 'light'
            ? 'border-slate-300 bg-white shadow-2xs'
            : 'border-zinc-800 bg-zinc-900 shadow-[0_0_14px_rgba(220,38,38,0.4)]'
        }`}
      >
        {!allFailed ? (
          <img
            src={candidates[candidateIndex]}
            alt="inspiro logo"
            className={`w-full h-full object-contain ${imgClassName}`}
            onError={handleImgError}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white font-black text-xs font-display">
            i
          </div>
        )}
      </div>

      {showText && (
        <div className="flex items-baseline gap-1.5 font-display text-xl md:text-2xl font-black tracking-tight">
          <span className={variant === 'light' ? 'text-slate-900' : 'text-white'}>inspiro</span>
          <span className="text-red-600 drop-shadow-[0_0_12px_rgba(220,38,38,0.6)]">LIVE</span>
        </div>
      )}
    </div>
  );
};

export default InspiroLogo;
