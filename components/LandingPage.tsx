
import React, { useEffect, useRef, useState } from 'react';
import { 
  VaultIcon, 
  ShieldCheckIcon, 
  LockIcon, 
  DatabaseIcon, 
  ActivityIcon,
  GitHubIcon,
  TwitterIcon,
  DiscordIcon,
  ArrowRightIcon,
  GlobeIcon,
  CpuIcon,
  ServerIcon,
  TerminalIcon
} from './Icons';
import TextScramble from './common/TextScramble';
import ParticleBackground from './common/ParticleBackground';
import Typewriter from './common/Typewriter';

import MagneticButton from './common/MagneticButton';

interface LandingPageProps {
  onEnter: () => void;
}

const USE_CASES = [
  { 
    title: "Secure P2P Payloads", 
    desc: "Signed handshakes for high-risk data exchange with ephemeral keys.", 
    icon: TerminalIcon,
    stat: "E2EE"
  },
  { 
    title: "Zero-Knowledge Backups", 
    desc: "Encrypted storage where only you hold the decryption keys.", 
    icon: DatabaseIcon,
    stat: "AES-256"
  },
  { 
    title: "Identity Vault", 
    desc: "Store sensitive credentials without server-side exposure.", 
    icon: LockIcon,
    stat: "NO-LOGS"
  },
  { 
    title: "Ephemeral Nodes", 
    desc: "Disposable secure tunnels for quick, anonymous audits.", 
    icon: ActivityIcon,
    stat: "TOR-LIKE"
  }
];

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Calculate normalized position -1 to 1
      const x = (clientX / innerWidth - 0.5) * 2;
      const y = (clientY / innerHeight - 0.5) * 2;
      
      setMousePosition({ x, y });
      
      containerRef.current.style.setProperty('--mouse-x', `${x}`);
      containerRef.current.style.setProperty('--mouse-y', `${y}`);
      containerRef.current.style.setProperty('--cursor-x', `${clientX}px`);
      containerRef.current.style.setProperty('--cursor-y', `${clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-violet-500/30 overflow-x-hidden">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
        
        {/* Particle System */}
        <ParticleBackground />

        {/* Glow Orbs */}
        <div 
          className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-violet-600/10 rounded-full blur-[120px] animate-blob mix-blend-screen"
          style={{ transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)` }}
        />
        <div 
          className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-screen"
          style={{ transform: `translate(${mousePosition.x * -30}px, ${mousePosition.y * -30}px)` }}
        />
        <div 
          className="absolute top-[40%] left-[40%] w-[30vw] h-[30vw] bg-fuchsia-600/10 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-screen"
          style={{ transform: `translate(${mousePosition.x * -10}px, ${mousePosition.y * -10}px)` }}
        />
        
        {/* Spotlight Effect following cursor */}
        <div 
          className="absolute inset-0 bg-[radial-gradient(600px_circle_at_var(--cursor-x)_var(--cursor-y),rgba(139,92,246,0.06),transparent_40%)]"
        />
      </div>

      {/* Header */}
      <header className="relative z-50 w-full p-4 md:p-6 lg:p-8 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3 lg:gap-4 group cursor-pointer" onClick={onEnter}>
          <div className="w-8 h-8 lg:w-12 lg:h-12 bg-white/5 border border-white/10 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/10 group-hover:scale-110 transition-transform duration-300">
            <VaultIcon className="w-4 h-4 lg:w-6 lg:h-6 text-violet-400 group-hover:text-violet-300 transition-colors" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-base lg:text-xl tracking-wider text-white flex items-center gap-2">
              VAULT<span className="text-violet-500">OS</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              <span className="text-[9px] lg:text-[11px] font-mono text-slate-500 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">System Secure</span>
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-5 lg:gap-8">
           <nav className="flex gap-5 lg:gap-8 text-[11px] lg:text-sm font-medium text-slate-400">
             <a href="#" className="hover:text-white transition-colors hover:underline decoration-violet-500 underline-offset-4">Protocol</a>
             <a href="#" className="hover:text-white transition-colors hover:underline decoration-violet-500 underline-offset-4">Network</a>
             <a href="#" className="hover:text-white transition-colors hover:underline decoration-violet-500 underline-offset-4">Security</a>
           </nav>
           <div className="h-3 lg:h-5 w-px bg-white/10"></div>
           <div className="flex items-center gap-2 text-[9px] lg:text-xs font-mono text-slate-500">
             <GlobeIcon className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 animate-spin-slow" />
             <span>US-EAST-1</span>
           </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-16 pb-24 lg:pt-32 lg:pb-40 px-4 text-center min-h-[75vh] lg:min-h-[85vh]">
        <div className="max-w-4xl lg:max-w-7xl w-full space-y-10 lg:space-y-14">
          
          {/* Badge */}
          <div className="flex justify-center scroll-reveal opacity-0 translate-y-4 transition-all duration-700">
             <div className="px-3 py-1 lg:px-5 lg:py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:bg-white/10 transition-colors cursor-default group">
               <span className="flex h-1.5 w-1.5 lg:h-2 lg:w-2 relative">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-1.5 w-1.5 lg:h-2 lg:w-2 bg-violet-500"></span>
               </span>
               <span className="text-[9px] lg:text-xs font-mono font-bold text-violet-300 tracking-widest uppercase group-hover:text-violet-200 transition-colors">
                 <TextScramble text="V2.0_STABLE_RELEASE" delay={500} />
               </span>
             </div>
          </div>

          {/* Main Title */}
          <div className="space-y-5 lg:space-y-8 scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-100">
             <h2 className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500 drop-shadow-2xl relative">
               <span className="block animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">SECURE</span>
               <span className="text-stroke-thin text-white/10 relative inline-block">
                  <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 animate-gradient-x opacity-30 blur-sm">INFRASTRUCTURE</span>
                  <Typewriter text="INFRASTRUCTURE" delay={1000} speed={100} cursor={false} />
               </span>
             </h2>
             <p className="text-slate-400 text-base md:text-lg lg:text-2xl font-light tracking-wide max-w-xl lg:max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
               The definitive sovereign interface for <span className="text-white font-medium relative inline-block">
                 high-assurance
                 <span className="absolute bottom-0 left-0 w-full h-px bg-violet-500/50"></span>
               </span> payload orchestration. 
               Built for the privacy-first internet.
             </p>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-6 lg:gap-10 scroll-reveal opacity-0 scale-95 transition-all duration-700 delay-200">
            <MagneticButton 
              onClick={onEnter}
              className="group relative h-12 px-10 lg:h-16 lg:px-14 bg-white text-slate-950 rounded-full font-bold text-xs lg:text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer opacity-0 group-hover:opacity-100"></div>
              <span className="relative z-10 flex items-center gap-2 lg:gap-3 group-hover:text-white transition-colors">
                Initialize Vault
                <ArrowRightIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </MagneticButton>
            
            <div className="flex items-center gap-6 lg:gap-10 text-[9px] lg:text-xs font-mono text-slate-500 uppercase tracking-widest animate-in fade-in duration-1000 delay-700">
              <div className="flex items-center gap-1.5 lg:gap-2.5 group cursor-help">
                <ShieldCheckIcon className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-emerald-500 group-hover:animate-bounce" />
                <span className="group-hover:text-emerald-400 transition-colors">Audited</span>
              </div>
              <div className="flex items-center gap-1.5 lg:gap-2.5 group cursor-help">
                <CpuIcon className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-violet-500 group-hover:animate-spin-slow" />
                <span className="group-hover:text-violet-400 transition-colors">E2E Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5 lg:gap-2.5 group cursor-help">
                <ServerIcon className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-blue-500 group-hover:animate-pulse" />
                <span className="group-hover:text-blue-400 transition-colors">P2P Network</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-16 lg:py-32 px-4 md:px-6 lg:px-12 border-t border-white/5 bg-black/20">
        <div className="max-w-6xl lg:max-w-[90rem] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
            {USE_CASES.map((useCase, i) => (
              <div 
                key={i} 
                className="group relative p-6 lg:p-10 rounded-2xl lg:rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-500 scroll-reveal opacity-0 translate-y-8 hover:-translate-y-2 hover:shadow-2xl hover:shadow-violet-500/10"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/5 group-hover:to-fuchsia-500/5 rounded-2xl lg:rounded-3xl transition-all duration-500"></div>
                
                <div className="absolute top-4 right-4 text-[8px] lg:text-[10px] font-mono text-slate-600 group-hover:text-violet-400 transition-colors">
                  {useCase.stat}
                </div>
                
                <div className="relative w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-5 lg:mb-8 group-hover:scale-110 group-hover:border-violet-500/30 transition-all duration-500 shadow-lg group-hover:shadow-violet-500/20">
                  <useCase.icon className="w-5 h-5 lg:w-7 lg:h-7 text-slate-400 group-hover:text-violet-400 transition-colors" />
                </div>
                
                <h3 className="relative text-base lg:text-xl font-bold text-white mb-2 lg:mb-4 group-hover:text-violet-200 transition-colors">{useCase.title}</h3>
                <p className="relative text-xs lg:text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {useCase.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-14 px-6 border-t border-white/5 bg-[#020617]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2 group cursor-pointer" onClick={onEnter}>
                 <VaultIcon className="w-5 h-5 text-violet-500 group-hover:rotate-12 transition-transform duration-300" />
                 <span className="text-lg font-bold text-white tracking-widest group-hover:text-violet-200 transition-colors">VAULT<span className="text-violet-500">OS</span></span>
              </div>
              <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                Advanced cryptographic primitives for the modern web. 
                Zero-knowledge architecture by default.
              </p>
            </div>
            
            <div className="flex gap-6">
              <a href="#" className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <GitHubIcon className="w-4 h-4" />
              </a>
              <a href="#" className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(29,161,242,0.2)]">
                <TwitterIcon className="w-4 h-4" />
              </a>
              <a href="#" className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(88,101,242,0.2)]">
                <DiscordIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-5 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            <p>&copy; 2025 VAULT SYSTEMS INC.</p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-slate-400 transition-colors hover:underline decoration-violet-500 underline-offset-4">Privacy</a>
              <a href="#" className="hover:text-slate-400 transition-colors hover:underline decoration-violet-500 underline-offset-4">Terms</a>
              <a href="#" className="hover:text-slate-400 transition-colors hover:underline decoration-violet-500 underline-offset-4">Status</a>
            </div>
          </div>
        </div>
      </footer>
      
      <style>{`
        .text-stroke-thin {
          -webkit-text-stroke: 1px rgba(255,255,255,0.1);
          color: transparent;
        }
        .scroll-reveal.is-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
