
import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon } from './Icons';
import ModernSpinner from './common/ModernSpinner';

interface AuthPanelProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
}

const AuthPanel: React.FC<AuthPanelProps> = React.memo(({ isConnected, isConnecting, onConnect }) => {
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setShowSuccessFlash(true);
      const timer = setTimeout(() => setShowSuccessFlash(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowSuccessFlash(false);
    }
  }, [isConnected]);

  return (
    <div className="p-6 rounded-[40px] relative overflow-hidden group transition-all duration-700 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20">
      {/* Decorative background glow with smooth transition */}
      <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000 ease-in-out pointer-events-none ${
          isConnected ? 'bg-emerald-500/10 scale-110 translate-y-4' : 'bg-violet-500/10 scale-100 translate-y-0'
      }`}></div>

      <div className="flex items-center justify-between mb-6 px-2 relative z-10">
        <h2 className="text-lg font-semibold text-white tracking-tight">Connection Status</h2>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isConnected 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-100' 
            : 'bg-slate-800/40 text-slate-500 border-white/5 shadow-none scale-95'
        }`}>
          <div className="relative flex h-2 w-2">
             <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 bg-current animate-ping ${isConnected ? 'block' : 'hidden'}`}></span>
             <span className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-500 ${isConnected ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
          </div>
          <div className="overflow-hidden h-3 relative w-12">
             <span className={`absolute inset-0 flex items-center transition-transform duration-500 ${isConnected ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                INACTIVE
             </span>
             <span className={`absolute inset-0 flex items-center transition-transform duration-500 ${isConnected ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
                SECURE
             </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-5 relative z-10">
        <div className={`relative overflow-hidden flex items-center gap-4 p-5 rounded-[30px] border transition-all duration-700 ease-out group/card ${
          isConnected 
            ? 'bg-emerald-950/20 border-emerald-500/20 shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]' 
            : 'bg-slate-800/20 border-white/5 hover:bg-slate-800/40 hover:border-white/10'
        }`}>
          {/* Status highlight bar */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-700 ease-out ${isConnected ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'bg-slate-800 group-hover/card:bg-slate-700'}`}></div>

          <div className={`relative p-3.5 rounded-2xl transition-all duration-700 ${
            isConnected 
              ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] rotate-0' 
              : 'bg-slate-900 text-slate-600 rotate-6 group-hover/card:rotate-0 group-hover/card:text-slate-400'
          }`}>
             <div className="relative w-6 h-6">
                <div className={`absolute inset-0 transition-all duration-700 transform ${isConnected ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-180'}`}>
                    <ShieldCheckIcon className="w-6 h-6" />
                </div>
                <div className={`absolute inset-0 transition-all duration-700 transform ${!isConnected ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-180'}`}>
                    <ShieldExclamationIcon className="w-6 h-6" />
                </div>
             </div>
          </div>
          <div className="flex-1 min-w-0">
             <div className="relative h-5 overflow-hidden">
                <div className={`absolute inset-0 transition-transform duration-700 ${isConnected ? 'translate-y-0' : '-translate-y-full'}`}>
                   <span className="text-sm font-bold tracking-wide text-white">Encryption Active</span>
                </div>
                <div className={`absolute inset-0 transition-transform duration-700 ${!isConnected ? 'translate-y-0' : 'translate-y-full'}`}>
                   <span className="text-sm font-bold tracking-wide text-slate-400">Encryption Inactive</span>
                </div>
             </div>
             <div className="relative h-4 overflow-hidden mt-0.5">
                 <div className={`absolute inset-0 transition-transform duration-700 delay-75 ${isConnected ? 'translate-y-0' : '-translate-y-full'}`}>
                   <span className="text-[11px] font-medium text-emerald-500/80">AES-256-GCM Tunnel Established</span>
                </div>
                <div className={`absolute inset-0 transition-transform duration-700 delay-75 ${!isConnected ? 'translate-y-0' : 'translate-y-full'}`}>
                   <span className="text-[11px] font-medium text-slate-600">Handshake required for access</span>
                </div>
             </div>
          </div>
        </div>

        <button
          onClick={onConnect}
          disabled={isConnected || isConnecting}
          className={`relative w-full h-14 overflow-hidden rounded-[30px] font-bold text-xs tracking-widest uppercase transition-all duration-500 ease-out group/btn ${
             isConnected 
             ? 'bg-slate-950 text-emerald-500 border border-emerald-500/20 cursor-default shadow-none' 
             : 'bg-white text-slate-900 hover:bg-slate-100 border border-transparent shadow-lg active:scale-[0.98]'
          } ${showSuccessFlash ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 scale-[1.02]' : ''}`}
        >
          {/* Connecting State Pulse */}
          <div className={`absolute inset-0 bg-slate-200 transition-opacity duration-300 ${isConnecting ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>

          {/* Connected State Background */}
          <div className={`absolute inset-0 bg-emerald-500/5 transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}></div>

          {/* Shimmer for Unconnected */}
          {!isConnected && !isConnecting && (
             <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent z-10"></div>
          )}
          
          <div className="relative z-20 flex items-center justify-center gap-2 transition-all duration-300">
            {isConnecting ? (
               <div className="flex items-center gap-2 text-slate-500">
                  <ModernSpinner size="sm" color="#64748b" />
                  <span>Handshaking...</span>
               </div>
            ) : (
              <div className="relative h-4 w-full flex items-center justify-center overflow-hidden">
                  {/* Connected Text */}
                  <div className={`absolute flex items-center gap-2 transition-all duration-500 ${isConnected ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                      <ShieldCheckIcon className={`w-4 h-4 ${showSuccessFlash ? 'animate-bounce' : ''}`} />
                      <span>System Connected</span>
                  </div>

                  {/* Connect Text */}
                  <div className={`absolute flex items-center gap-2 transition-all duration-500 ${!isConnected ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
                      <span>Connect Node</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 group-hover/btn:bg-emerald-500 transition-colors duration-300 shadow-sm"></div>
                  </div>
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
});

export default AuthPanel;
