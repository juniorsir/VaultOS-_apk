
import React, { useState } from 'react';
import { ShieldCheckIcon } from '../Icons';

const SyncNodeButton: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  const [isHovered, setIsHovered] = useState(false);
  const particles = Array.from({ length: 12 });

  return (
    <button 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onEnter}
      className="group relative h-20 md:h-24 px-12 md:px-20 bg-slate-800 border border-white/20 text-white rounded-[1.5rem] md:rounded-[2.5rem] font-black text-base md:text-lg tracking-[0.3em] md:tracking-[0.5em] uppercase transition-all duration-700 hover:scale-105 active:scale-95 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] hover:shadow-primary-500/30 overflow-hidden"
    >
      <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.85,0,0.15,1)]"></div>
      
      <span className="relative z-10 flex items-center gap-3 md:gap-5 transition-colors group-hover:text-slate-950">
        Sync Node
        <div className="relative w-6 h-6 md:w-7 md:h-7 flex items-center justify-center overflow-visible">
          {particles.map((_, i) => (
            <div
              key={i}
              className={`absolute inset-0 m-auto w-1 h-1 bg-primary-400 rounded-full pointer-events-none opacity-0 transition-opacity duration-300 ${isHovered ? 'animate-particle-out' : ''}`}
              style={{
                '--tw-translate-x': `${Math.cos((i * 30) * (Math.PI / 180)) * 50}px`,
                '--tw-translate-y': `${Math.sin((i * 30) * (Math.PI / 180)) * 50}px`,
                animationDelay: `${i * 0.04}s`
              } as any}
            />
          ))}
          <div className={`absolute inset-0 transition-all duration-500 ${isHovered ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
            <ShieldCheckIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <div className={`absolute inset-0 transition-all duration-500 delay-150 ${isHovered ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}`}>
            <ShieldCheckIcon className="w-6 h-6 md:w-7 md:h-7 text-primary-500 drop-shadow-[0_0_10px_rgba(14,165,233,0.8)] group-hover:text-slate-900" />
          </div>
        </div>
      </span>
    </button>
  );
};

export default SyncNodeButton;
