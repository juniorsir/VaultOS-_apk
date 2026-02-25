
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ServerIcon, LockIcon, UserGroupIcon } from '../Icons';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  type: 'data' | 'threat';
}

const ProtocolShowcase: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState(0);
  const stages = useMemo(() => ['IDLE', 'INGRESS', 'INTEGRITY', 'REFORMATION', 'HARDENING', 'THREAT_DEFENSE', 'EGRESS'], []);
  const particles = useRef<Particle[]>([]);
  const requestRef = useRef<number>(null);
  const ripples = useRef<{ x: number, y: number, r: number, a: number, color: string }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((s) => (s + 1) % stages.length);
    }, 4500); 
    return () => clearInterval(timer);
  }, [stages.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      initParticles(width, height);
    };

    const initParticles = (w: number, h: number) => {
      const count = w < 768 ? 100 : 250;
      particles.current = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        targetX: w / 2,
        targetY: h / 2,
        vx: 0,
        vy: 0,
        size: Math.random() * 1.5 + 0.5,
        color: '#0ea5e9',
        alpha: Math.random(),
        type: i > count * 0.85 ? 'threat' : 'data'
      }));
    };

    if (particles.current.length === 0) {
        const { width, height } = container.getBoundingClientRect();
        initParticles(width, height);
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const leftNodeX = width < 768 ? width * 0.15 : width * 0.2;
      const rightNodeX = width < 768 ? width * 0.85 : width * 0.8;

      ctx.clearRect(0, 0, width, height);
      
      if (stage === 2) {
        const scanProgress = (Date.now() % 4500) / 4500;
        const scanW = width < 768 ? 120 : 200;
        const scanTotalDistance = scanW * 2; 
        const scanX = centerX - (scanW/1.5) + (scanProgress * scanTotalDistance);
        
        const gradient = ctx.createLinearGradient(scanX - 20, 0, scanX + 20, 0);
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0)');
        gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.4)');
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(scanX - 20, centerY - (height * 0.25), 40, height * 0.5);
      }

      if (stage === 4) {
        const radius = width < 768 ? 45 : 70;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + Math.sin(Date.now() * 0.005) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)'; 
        ctx.lineWidth = 1;
        ctx.stroke();

        const time = Date.now() * 0.002;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, time, time + Math.PI / 1.5);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10, -time * 1.5, -time * 1.5 + Math.PI);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (stage === 5) {
        const shieldRadius = width < 768 ? 60 : 90;
        ctx.beginPath();
        ctx.arc(centerX, centerY, shieldRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2 + Math.random(); 
        ctx.stroke();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.fill();
      }

      if (stage === 6) {
        // Transmission Beam Effect
        const dist = rightNodeX - centerX;
        
        // 1. Outer Glow Trace
        const gradientTrace = ctx.createLinearGradient(centerX, centerY, rightNodeX, centerY);
        gradientTrace.addColorStop(0, 'rgba(139, 92, 246, 0)');
        gradientTrace.addColorStop(0.1, 'rgba(139, 92, 246, 0.3)');
        gradientTrace.addColorStop(0.9, 'rgba(192, 38, 211, 0.3)');
        gradientTrace.addColorStop(1, 'rgba(192, 38, 211, 0)');

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(rightNodeX, centerY);
        ctx.strokeStyle = gradientTrace;
        ctx.lineWidth = 8 + Math.sin(Date.now() * 0.01) * 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 2. Core Energy Beam
        const gradientCore = ctx.createLinearGradient(centerX, centerY, rightNodeX, centerY);
        gradientCore.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradientCore.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)');
        gradientCore.addColorStop(0.9, 'rgba(232, 121, 249, 0.9)');
        gradientCore.addColorStop(1, 'rgba(232, 121, 249, 0.1)');

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(rightNodeX, centerY);
        ctx.strokeStyle = gradientCore;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Transmission Rings/Pulses
        const time = Date.now() * 0.003;
        const waveCount = 3;
        for(let i = 0; i < waveCount; i++) {
            const t = (time + i / waveCount) % 1;
            // Only show rings in the middle 80% of the beam to avoid clipping nodes
            if (t > 0.1 && t < 0.9) {
                const x = centerX + t * dist;
                const size = 12 * Math.sin(t * Math.PI); 
                const opacity = Math.sin(t * Math.PI);
                
                ctx.beginPath();
                ctx.ellipse(x, centerY, 4, size, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
      }

      ripples.current = ripples.current.filter(r => r.a > 0.01);
      ripples.current.forEach(r => {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace(')', `, ${r.a})`).replace('rgb', 'rgba');
        ctx.lineWidth = 1.5;
        ctx.stroke();
        r.r += 1;
        r.a *= 0.92;
      });

      particles.current.forEach((p, i) => {
        let pColor = '#0ea5e9';
        let pAlpha = 0.6;
        let ease = 0.05;

        if (p.type === 'threat') {
            if (stage === 5) {
                pColor = '#ef4444';
                pAlpha = 1;
            } else {
                pAlpha = 0;
            }
        }

        switch (stage) {
          case 0:
            const orbitRadius = width < 768 ? 25 : 40;
            const speed = 0.001;
            const orbitOffset = i * 0.1;
            p.targetX = leftNodeX + Math.cos(Date.now() * speed + orbitOffset) * orbitRadius;
            p.targetY = centerY + Math.sin(Date.now() * speed + orbitOffset) * orbitRadius;
            pColor = '#94a3b8';
            pAlpha = 0.3;
            ease = 0.02;
            break;

          case 1:
            const flowProgress = (Date.now() % 3000) / 3000;
            if (i % 3 === 0) {
               p.targetX = centerX + (Math.random() - 0.5) * (width * 0.1);
               p.targetY = centerY + (Math.random() - 0.5) * (height * 0.15);
               ease = 0.03;
            } else {
               p.targetX = centerX - (width * 0.2) + (Math.random() * width * 0.1);
               p.targetY = centerY + (Math.random() - 0.5) * (height * 0.3);
               ease = 0.05;
            }
            pColor = '#38bdf8';
            break;

          case 2:
            const cols = 14;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const spacing = width < 768 ? 10 : 14;
            const gridW = cols * spacing;
            
            p.targetX = centerX - (gridW/2) + col * spacing;
            p.targetY = centerY - (width < 768 ? 40 : 60) + row * spacing;

            const scanProgress = (Date.now() % 4500) / 4500;
            const scanWLocal = width < 768 ? 120 : 200;
            const scanTotal = scanWLocal * 2;
            const scanXLocal = -(scanWLocal/1.5) + (scanProgress * scanTotal);
            const pxLocal = p.x - centerX;
            
            if (Math.abs(pxLocal - scanXLocal) < 15) {
                pColor = '#ffffff';
                p.size = 2;
                pAlpha = 1;
            } else if (pxLocal < scanXLocal) {
                pColor = '#22c55e';
                pAlpha = 0.8;
            } else {
                pColor = '#38bdf8';
                pAlpha = 0.4;
            }
            ease = 0.15;
            break;

          case 3:
            const angle = (i * 137.5) * (Math.PI / 180);
            const r = (width < 768 ? 25 : 45) * Math.sqrt((i + 1) / particles.current.length); 
            const rot = Date.now() * 0.0005;
            p.targetX = centerX + Math.cos(angle + rot) * r * 3;
            p.targetY = centerY + Math.sin(angle + rot) * r * 3;
            p.targetX = centerX + Math.cos(angle + rot) * (r * 1.5);
            p.targetY = centerY + Math.sin(angle + rot) * (r * 1.5);
            pColor = '#818cf8';
            ease = 0.08;
            break;

          case 4:
            const hAngle = (Date.now() * 0.002) + (i * (Math.PI * 2 / (particles.current.length * 0.5)));
            const hRadius = (width < 768 ? 45 : 70); 
            if (i % 2 === 0) {
                 p.targetX = centerX + Math.cos(hAngle) * hRadius;
                 p.targetY = centerY + Math.sin(hAngle) * hRadius;
            } else {
                 p.targetX = centerX + (Math.random() - 0.5) * 40;
                 p.targetY = centerY + (Math.random() - 0.5) * 40;
            }
            pColor = '#6366f1';
            ease = 0.1;
            break;

          case 5:
            const shieldR = width < 768 ? 60 : 90;
            if (p.type === 'data') {
                p.targetX = centerX + (Math.random() - 0.5) * 30;
                p.targetY = centerY + (Math.random() - 0.5) * 30;
                pColor = '#6366f1';
                pAlpha = 0.8;
                ease = 0.2;
            } else {
                const attackAngle = Math.atan2(centerY - p.y, centerX - p.x);
                const distToCenter = Math.sqrt((p.x - centerX)**2 + (p.y - centerY)**2);
                if (distToCenter > shieldR + 10) {
                     p.targetX = centerX + (Math.random() - 0.5) * 50;
                     p.targetY = centerY + (Math.random() - 0.5) * 50;
                     ease = 0.04;
                } else {
                    p.vx = -Math.cos(attackAngle) * 5;
                    p.vy = -Math.sin(attackAngle) * 5;
                    p.targetX = p.x + p.vx * 10;
                    p.targetY = p.y + p.vy * 10;
                    if (Math.random() > 0.92) {
                        ripples.current.push({ 
                            x: centerX + Math.cos(attackAngle) * shieldR, 
                            y: centerY + Math.sin(attackAngle) * shieldR, 
                            r: 5, 
                            a: 0.8, 
                            color: 'rgb(239, 68, 68)' 
                        });
                    }
                }
            }
            break;

          case 6:
             if (p.type === 'data') {
                // Funnel particles into the beam path
                p.targetX = rightNodeX + (Math.random() - 0.5) * 20;
                p.targetY = centerY + (Math.random() - 0.5) * 10; // Tighter vertical spread
                ease = 0.12;
                pColor = '#e879f9'; // fuchsia-400 to match beam
                pAlpha = 1.0;
                // Add glitter effect
                if (Math.random() > 0.9) pColor = '#ffffff';
             } else {
                p.targetX = p.x + (p.x - centerX) * 0.1;
                p.targetY = p.y + (p.y - centerY) * 0.1;
                pAlpha *= 0.85;
             }
             break;
        }

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        p.vx += dx * ease * 0.1;
        p.vy += dy * ease * 0.1;
        p.vx *= 0.9; 
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;

        if (pAlpha > 0.01) {
            ctx.fillStyle = pColor;
            ctx.globalAlpha = pAlpha;
            ctx.beginPath();
            if (stage === 2 && p.type === 'data') {
                ctx.rect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else {
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            }
            ctx.fill();
        }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [stage]);

  return (
    <div ref={containerRef} className="liquid-glass-panel relative w-full max-w-6xl mx-auto h-[18.75rem] md:h-[31.25rem] rounded-[2rem] md:rounded-[3.5rem] overflow-hidden flex items-center justify-center mt-12 md:mt-20 group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)]">
      
      <div className="absolute inset-4 md:inset-8 border border-red-500/30 rounded-lg pointer-events-none z-0"></div>
      <div className="absolute inset-0 bg-white/[0.01] pointer-events-none"></div>
      
      <div className="absolute top-8 md:top-12 left-8 md:left-12 flex flex-col gap-2 md:gap-3 z-50 pointer-events-none">
         <div className="flex items-center gap-3 md:gap-4">
            <div className={`w-2 md:w-3 h-2 md:h-3 rounded-full ${stage === 5 ? 'bg-red-500 animate-pulse' : 'bg-primary-500'} transition-colors duration-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]`}></div>
            <span className="text-[9px] md:text-[11px] font-mono text-slate-200 uppercase tracking-[0.2em] md:tracking-[0.4em] font-black">
              {stage === 0 && 'System_Idle // Awaiting_Input'}
              {stage === 1 && 'Ingress: Receiving_Packet_Stream'}
              {stage === 2 && 'Integrity: Molecular_Audit'}
              {stage === 3 && 'Reformation: Structuring_Data'}
              {stage === 4 && 'Hardening: Applying_Encryption_Layer'}
              {stage === 5 && 'Alert: Deflecting_Signature_Mismatch'}
              {stage === 6 && 'Egress: Routing_To_Secure_Terminal'}
            </span>
         </div>
         <div className="text-[7px] md:text-[9px] font-mono text-slate-500 uppercase tracking-[0.1em] md:tracking-[0.2em] ml-5 md:ml-7 flex items-center gap-2 md:gap-4">
           <span>Thread: 0x9F_STABLE</span>
           <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-slate-800 rounded-full"></span>
           <span className={stage === 5 ? 'text-red-500 font-bold' : 'text-slate-600'}>
             Status: {stage === 5 ? 'DEFENSIVE_MODE' : 'NOMINAL_FLOW'}
           </span>
         </div>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full pointer-events-none" />

      <div className="relative w-full h-full flex items-center justify-between px-8 md:px-24 pointer-events-none">
        
        <div className={`flex flex-col items-center transition-all duration-1000 transform ${stage === 0 || stage === 1 ? 'scale-110 opacity-100 translate-x-0' : 'opacity-20 scale-90 -translate-x-4'}`}>
           <div className="relative p-3 md:p-6 glass rounded-2xl md:rounded-3xl border-white/10 bg-white/5">
              <ServerIcon className="w-8 h-8 md:w-16 md:h-16 text-slate-300" />
           </div>
           <div className="text-[7px] md:text-[10px] font-mono text-primary-400 mt-2 md:mt-4 text-center tracking-[0.3em] font-black uppercase italic">Node_Alpha</div>
        </div>

        <div className="relative z-20">
           {(stage === 4 || stage === 5) && (
             <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in fade-in duration-700">
                <div className={`p-5 md:p-8 glass rounded-full shadow-[0_0_50px_rgba(129,140,248,0.2)] ${stage === 5 ? 'bg-red-500/10 scale-110 shadow-red-500/20' : 'bg-indigo-500/10'} transition-all duration-300`}>
                  <LockIcon className={`w-6 h-6 md:w-12 md:h-12 ${stage === 5 ? 'text-red-200' : 'text-white'} ${stage === 4 ? 'animate-pulse' : ''}`} />
                </div>
             </div>
           )}
        </div>

        <div className={`flex flex-col items-center transition-all duration-1000 transform ${stage === 6 ? 'opacity-100 scale-110 translate-x-0' : 'opacity-20 scale-90 translate-x-4'}`}>
           <div className="relative p-3 md:p-6 glass rounded-2xl md:rounded-3xl border-primary-500/40 bg-primary-500/10 shadow-[0_0_30px_rgba(14,165,233,0.2)]">
              <UserGroupIcon className="w-8 h-8 md:w-16 md:h-16 text-primary-400" />
           </div>
           <div className="text-[7px] md:text-[10px] font-mono text-primary-400 mt-2 md:mt-4 text-center tracking-[0.3em] font-black uppercase italic">Secure_Terminal</div>
        </div>
      </div>

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
    </div>
  );
};

export default ProtocolShowcase;
