
import React, { useEffect, useRef } from 'react';
import { 
  VaultIcon, 
  ShieldCheckIcon, 
  LockIcon, 
  DatabaseIcon, 
  ActivityIcon,
  GitHubIcon,
  TwitterIcon,
  DiscordIcon,
  TerminalIcon,
  ArrowRightIcon
} from './Icons';
import TextScramble from './common/TextScramble';
import SocialIcon from './landing/SocialIcon';

interface LandingPageProps {
  onEnter: () => void;
}

const USE_CASES = [
  { title: "Secure P2P Payloads", desc: "Signed handshakes for high-risk data exchange.", icon: TerminalIcon },
  { title: "Zero-Knowledge Backups", desc: "Encrypted storage with client-side keys.", icon: DatabaseIcon },
  { title: "Identity Vault", desc: "Store sensitive credentials without server exposure.", icon: LockIcon },
  { title: "Ephemeral Nodes", desc: "Disposable secure tunnels for quick audits.", icon: ActivityIcon }
];

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Intersection Observer for scroll animations
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach(el => observerRef.current?.observe(el));

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-violet-500/30 overflow-x-hidden [--mouse-x:0px] [--mouse-y:0px]">
      
      {/* Liquid Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="liquid-blob bg-violet-600/20 w-[60vw] h-[60vw] top-[-10%] left-[-10%]"></div>
        <div className="liquid-blob bg-emerald-600/20 w-[50vw] h-[50vw] bottom-[-10%] right-[-10%]" style={{ animationDelay: '-5s' }}></div>
        <div className="liquid-blob bg-sky-600/20 w-[40vw] h-[40vw] top-[40%] left-[30%]" style={{ animationDelay: '-10s' }}></div>
      </div>

      <header className="relative z-50 w-full p-6 md:p-12 flex justify-between items-start animate-in fade-in slide-in-from-top-8 duration-1000">
        <div className="flex items-center gap-3 md:gap-5 group cursor-default">
          <div className="p-2.5 md:p-3.5 glass-card-liquid rounded-xl md:rounded-2xl transition-all duration-700 group-hover:rotate-12 group-hover:scale-110">
            <VaultIcon className="w-5 h-5 md:w-7 md:h-7 text-violet-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black tracking-[0.2em] text-base md:text-xl text-white uppercase italic flex items-center">
              VAULT<span className="bg-gradient-to-br from-violet-500 to-blue-400 text-white px-1 ml-1">OS</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
              <span className="text-[7px] md:text-[9px] font-mono text-slate-500 tracking-widest uppercase">Security Enabled</span>
            </div>
          </div>
        </div>
        
        <div className="hidden lg:flex flex-col items-end gap-2 text-right">
           <div className="flex gap-4">
              <div className="px-3 py-1 glass-card-liquid rounded-lg text-[9px] font-mono text-slate-400 uppercase tracking-widest">Latency: 0.04ms</div>
              <div className="px-3 py-1 glass-card-liquid rounded-lg text-[9px] font-mono text-slate-400 uppercase tracking-widest">Uptime: 100%</div>
           </div>
        </div>
      </header>

      <section 
        className="relative z-10 flex flex-col items-center justify-center pt-12 md:pt-32 pb-20 px-4 md:px-6 text-center transition-transform duration-1000 ease-out"
        style={{ transform: `translate3d(var(--mouse-x), var(--mouse-y), 0)` }}
      >
        <div className="max-w-6xl w-full space-y-10 md:space-y-16">
          <div className="flex justify-center scroll-animate opacity-0 translate-y-8">
             <div className="px-6 md:px-8 py-2 md:py-2.5 bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-full text-violet-400 text-[7px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] shadow-[0_0_30px_rgba(139,92,246,0.15)]">
               <TextScramble text="ESTABLISHING_SECURE_TUNNEL" delay={1000} />
             </div>
          </div>

          <div className="space-y-6 md:space-y-8 scroll-animate opacity-0 translate-y-12" style={{ transitionDelay: '200ms' }}>
             <h2 className="text-[5rem] md:text-[8rem] lg:text-[10rem] font-black tracking-tighter leading-[0.9] italic text-white flex justify-center items-center flex-wrap drop-shadow-2xl">
               VAULT<span className="bg-gradient-to-br from-violet-500 to-blue-400 text-white px-2 md:px-4 ml-1 md:ml-2">OS</span>
             </h2>
             <p className="text-slate-400 text-sm md:text-xl font-light tracking-tight max-w-2xl mx-auto leading-relaxed px-4">
               High-assurance security for sovereign data orchestrations. <span className="text-white font-medium italic">Verified handshakes</span> and <span className="text-white font-medium italic">hardened transmission</span> tunnels.
             </p>
          </div>

          <div className="flex flex-col items-center gap-10 scroll-animate opacity-0 scale-95" style={{ transitionDelay: '400ms' }}>
            <button 
              onClick={onEnter}
              className="group relative h-16 md:h-20 px-10 md:px-16 bg-slate-900/40 backdrop-blur-xl border border-white/5 text-white rounded-[2rem] md:rounded-[3rem] font-bold text-sm md:text-lg tracking-[0.2em] md:tracking-[0.3em] uppercase transition-all duration-500 hover:bg-slate-800/60 hover:border-white/10 active:scale-95 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]"
            >
              <span className="relative z-10 flex items-center gap-4">
                INITIALIZE NODE
                <ArrowRightIcon className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform duration-500 font-light" />
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-32 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {USE_CASES.map((useCase, i) => (
            <div 
              key={i} 
              className="group glass-card-liquid p-8 md:p-10 rounded-3xl md:rounded-[2.5rem] transition-all duration-1000 hover:-translate-y-4 hover:shadow-[0_20px_40px_-10px_rgba(139,92,246,0.2)] scroll-animate opacity-0 translate-y-12"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl liquid-glass-container flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                <useCase.icon className="w-6 h-6 md:w-8 md:h-8 text-violet-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider mb-3 md:mb-4">{useCase.title}</h3>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">{useCase.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 py-16 md:py-24 px-6 md:px-10 border-t border-white/5 bg-slate-950/50 backdrop-blur-3xl scroll-animate opacity-0 translate-y-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 lg:gap-24">
            <div className="md:col-span-5 space-y-6 md:space-y-10 scroll-animate opacity-0 translate-x-[-20px]" style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center gap-4">
                 <VaultIcon className="w-6 h-6 md:w-8 md:h-8 text-violet-500" />
                 <span className="text-xl md:text-3xl font-black text-white italic tracking-tighter uppercase flex items-center">VAULT<span className="bg-gradient-to-br from-violet-500 to-blue-400 text-white px-1 ml-1">OS</span></span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-sm font-medium italic">
                A definitive sovereign interface for high-security payload orchestration. Built for the privacy-first internet.
              </p>
              <div className="flex gap-4">
                <SocialIcon Icon={GitHubIcon} href="https://github.com" />
                <SocialIcon Icon={TwitterIcon} href="https://twitter.com" />
                <SocialIcon Icon={DiscordIcon} href="https://discord.com" />
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-2 gap-8 md:gap-12 scroll-animate opacity-0 translate-x-[20px]" style={{ transitionDelay: '400ms' }}>
               <div className="space-y-6 md:space-y-8">
                 <h4 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.3em] md:tracking-[0.5em]">Protocol Core</h4>
                 <ul className="space-y-3 md:space-y-4 text-[11px] md:text-sm font-bold text-slate-300">
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Sovereign Docs</a></li>
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Privacy Kernel</a></li>
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Audit Logs</a></li>
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Whitepaper</a></li>
                 </ul>
               </div>

               <div className="space-y-6 md:space-y-8">
                 <h4 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.3em] md:tracking-[0.5em]">System Meta</h4>
                 <ul className="space-y-3 md:space-y-4 text-[11px] md:text-sm font-bold text-slate-300">
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Global Node Map</a></li>
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Security Levels</a></li>
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Handshake Specs</a></li>
                   <li><a href="#" className="hover:text-violet-400 transition-colors">Bug Bounty</a></li>
                 </ul>
               </div>
            </div>
          </div>

          <div className="mt-16 md:mt-24 pt-8 md:pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10 text-center md:text-left scroll-animate opacity-0 translate-y-4" style={{ transitionDelay: '600ms' }}>
             <div className="flex flex-col gap-3">
               <p className="text-[9px] md:text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                 &copy; 2025 Vault-OS Protocol Core. Distributed Under Zero-Knowledge License.
               </p>
               <p className="text-[9px] md:text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">
                 Engineered by <span className="text-violet-400 font-bold">VaultOS Team</span>
               </p>
             </div>
             <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 text-[9px] md:text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2 italic"><ShieldCheckIcon className="w-3 md:w-4 h-3 md:h-4 text-emerald-400" /> Zero-Log Verified</span>
                <span className="px-3 md:px-4 py-1.5 glass-card-liquid rounded-full border-white/10 text-violet-400 font-black italic">BUILD_v2.0_LIQUID</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
