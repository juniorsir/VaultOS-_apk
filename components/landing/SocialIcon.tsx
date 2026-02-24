import React, { useState } from 'react';

const SocialIcon: React.FC<{ Icon: React.FC<any>; href: string }> = ({ Icon, href }) => {
  const [isHovered, setIsHovered] = useState(false);
  const particles = Array.from({ length: 8 });

  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative p-4 rounded-full bg-slate-900/50 border border-white/5 transition-all duration-500 hover:bg-primary-500/10 hover:border-primary-500/30 group overflow-visible cursor-pointer block"
    >
      {/* Particles */}
      {particles.map((_, i) => (
        <div
          key={i}
          className={`absolute inset-0 m-auto w-1 h-1 bg-primary-400 rounded-full pointer-events-none opacity-0 transition-opacity duration-300 ${isHovered ? 'animate-particle-out' : ''}`}
          style={{
            '--tw-translate-x': `${Math.cos((i * 45) * (Math.PI / 180)) * 40}px`,
            '--tw-translate-y': `${Math.sin((i * 45) * (Math.PI / 180)) * 40}px`,
            animationDelay: `${i * 0.05}s`
          } as any}
        />
      ))}

      <div className={`relative transition-all duration-500 ${isHovered ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
        <Icon className="w-5 h-5 text-slate-400" />
      </div>

      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 delay-150 ${isHovered ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}`}>
        <Icon className="w-5 h-5 text-primary-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
      </div>
    </a>
  );
};

export default SocialIcon;