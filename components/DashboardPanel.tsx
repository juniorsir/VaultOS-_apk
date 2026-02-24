
import React, { useState, useEffect } from 'react';
import { ActivityIcon, ServerIcon, DatabaseIcon, ChainIcon, ShieldCheckIcon, LockIcon } from './Icons';

interface DashboardPanelProps {
  isConnected: boolean;
  logsCount: number;
  preserveSession?: boolean;
  onTogglePreserve?: () => void;
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ isConnected, logsCount, preserveSession = false, onTogglePreserve }) => {
  const [copied, setCopied] = useState(false);
  const [uptime, setUptime] = useState(0);

  // Fake uptime counter for visual effect, resets on mount or disconnect could be handled better but fine for visual flair
  useEffect(() => {
    // Reset uptime when connected
    if (isConnected) {
        setUptime(0);
        const interval = setInterval(() => {
            setUptime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    } else {
        setUptime(0);
    }
  }, [isConnected]);

  const formatUptime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGetBaseUrl = async () => {
    const origin = window.location.origin;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(origin);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = origin;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed', err);
        }
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[40px] border border-slate-800 bg-[#0a0f1c]/80 backdrop-blur-xl shadow-2xl group glass-animate">
      {/* Matrix Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>

      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-emerald-500/80 tracking-[0.2em] uppercase flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                System Matrix
            </h2>
            <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                v2.4.0
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Status Card */}
            <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-emerald-500/30 transition-all group/card relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            <ActivityIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Node Status</span>
                    </div>
                    <div className={`text-xl font-bold font-mono ${isConnected ? 'text-white' : 'text-red-400'}`}>
                        {isConnected ? 'OPERATIONAL' : 'DISCONNECTED'}
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full ${isConnected ? 'bg-emerald-500 w-full animate-pulse' : 'bg-red-500 w-full'}`}></div>
                    </div>
                </div>
            </div>

            {/* Protocol Card */}
            <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-violet-500/30 transition-all group/card relative overflow-hidden">
                <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isConnected ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-800 text-slate-500'}`}>
                            <ServerIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Protocol</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                        {isConnected ? 'HARDENED' : 'STANDBY'}
                    </div>
                    <div className="flex gap-1 mt-3">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full ${isConnected ? 'bg-violet-500' : 'bg-slate-800'} opacity-${i*25}`}></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Uptime Card */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 relative overflow-hidden">
                 <div className="flex flex-col h-full justify-between">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheckIcon className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Session Uptime</span>
                    </div>
                    <div className="text-lg font-mono text-emerald-400">
                        {isConnected ? formatUptime(uptime) : '00:00:00'}
                    </div>
                 </div>
            </div>

            {/* Logs/Packets Card */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 relative overflow-hidden">
                 <div className="flex flex-col h-full justify-between">
                    <div className="flex items-center gap-2 mb-1">
                        <DatabaseIcon className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Data Packets</span>
                    </div>
                    <div className="text-lg font-mono text-blue-400">
                        {logsCount.toLocaleString()} <span className="text-[10px] text-slate-600">Events</span>
                    </div>
                 </div>
            </div>
        </div>

        <div className="space-y-4">
            {onTogglePreserve && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={onTogglePreserve}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${preserveSession ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-500'}`}>
                            <LockIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-300">Persistence Layer</div>
                            <div className="text-[10px] text-slate-500">Keep session active on reload</div>
                        </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${preserveSession ? 'bg-amber-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${preserveSession ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                </div>
            )}

            <button
            onClick={handleGetBaseUrl}
            className="liquid-btn w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all text-xs font-bold uppercase tracking-wider group"
            style={{ '--liquid-color': 'rgba(16, 185, 129, 0.1)' } as React.CSSProperties}
            >
            <ChainIcon className={`w-3.5 h-3.5 ${copied ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400'} transition-colors`} />
            <span>{copied ? 'Endpoint Copied' : 'Copy Node Endpoint'}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
