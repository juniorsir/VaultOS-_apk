
import React, { useState } from 'react';
import { 
  ChainIcon, CodeIcon, LockIcon, 
  DownloadIcon, PlayIcon, EyeIcon, TrashIcon 
} from '../Icons';
import ModernSpinner from '../common/ModernSpinner';
import SineWaveProgress from '../common/SineWaveProgress';

interface RetrievalSectionProps {
  fileCode: string;
  setFileCode: (code: string) => void;
  downloadPassword: string;
  setDownloadPassword: (pass: string) => void;
  isConnected: boolean;
  isBusy: boolean;
  activeOperation: string | null;
  downloadProgress?: number;
  onDownload: () => void;
  onPlay: () => void;
  onInspect: () => void;
  onDelete: () => void;
}

export function RetrievalSection({
  fileCode, setFileCode,
  downloadPassword, setDownloadPassword,
  isConnected, isBusy, activeOperation,
  downloadProgress = 0,
  onDownload, onPlay, onInspect, onDelete
}: RetrievalSectionProps) {
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const copyShareLink = async () => {
    if (!fileCode) return;
    const finalLink = `${window.location.origin}${window.location.pathname}?v=${fileCode}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(finalLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = finalLink;
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
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="relative p-6 rounded-[30px] border border-white/10 bg-gradient-to-b from-slate-800/20 to-slate-950/40 backdrop-blur-md shadow-2xl overflow-hidden group">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
      
      {/* Download Progress Overlay */}
      {isBusy && activeOperation === 'download' && (
         <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300 px-8">
             <div className="w-full max-w-sm space-y-5">
                 <div className="flex justify-between items-end text-slate-300 px-1">
                     <span className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">Retrieving Data</span>
                     <span className="text-xl font-mono font-bold text-violet-400">{downloadProgress}%</span>
                 </div>
                 
                 <div className="relative w-full h-12 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                     <SineWaveProgress 
                        progress={downloadProgress} 
                        className="w-full h-full"
                        color="rgba(139, 92, 246, 1)" 
                        variant="horizontal"
                     />
                 </div>
                 
                 <div className="text-center">
                    <span className="text-[10px] text-slate-500 font-mono">Decrypting secure packets...</span>
                 </div>
             </div>
         </div>
      )}

      <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 flex items-center gap-2">
               Download or Inspect File
            </label>
            {fileCode && (
              <button 
                onClick={copyShareLink}
                className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-violet-500/20 transition-all active:scale-95 shadow-sm hover:shadow-violet-500/20"
              >
                <ChainIcon className="w-3 h-3" />
                {shareLinkCopied ? 'Copied' : 'Share'}
              </button>
            )}
          </div>

          <div className="space-y-4">
               <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">File Code</label>
                   <div className="relative group/input">
                       <input
                        type="text"
                        value={fileCode}
                        onChange={(e) => setFileCode(e.target.value)}
                        placeholder="Enter secure code..."
                        disabled={!isConnected}
                        className="w-full h-12 pl-10 pr-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50 focus:ring-1 focus:ring-violet-500/20 font-mono text-sm shadow-inner transition-all duration-300"
                      />
                      <div className="absolute left-3 top-3.5 text-slate-600 group-focus-within/input:text-violet-400 transition-colors">
                          <CodeIcon className="w-5 h-5" />
                      </div>
                   </div>
               </div>

               <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Decryption Key (Optional)</label>
                    <div className="relative group/input">
                        <input
                          type="password"
                          value={downloadPassword}
                          onChange={(e) => setDownloadPassword(e.target.value)}
                          placeholder="Enter password if required"
                          disabled={!isConnected}
                          className="w-full h-12 pl-10 pr-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50 focus:ring-1 focus:ring-violet-500/20 text-sm shadow-inner transition-all duration-300"
                        />
                         <div className="absolute left-3 top-3.5 text-slate-600 group-focus-within/input:text-violet-400 transition-colors">
                             <LockIcon className="w-5 h-5" />
                         </div>
                    </div>
                </div>
          </div>
          
          <div className="grid grid-cols-4 gap-3 pt-2">
              <button
                onClick={onDownload}
                disabled={!isConnected || !fileCode || isBusy}
                className="liquid-btn group relative h-24 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.3)] hover:border-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                style={{ '--liquid-color': 'rgba(139, 92, 246, 0.1)' } as React.CSSProperties}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-fuchsia-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-violet-500/50 group-hover:bg-violet-500/20 transition-all duration-300 group-hover:scale-110 shadow-lg">
                    {isBusy && activeOperation === 'download' ? (
                        <ModernSpinner size="sm" color="#c4b5fd" />
                    ) : (
                        <DownloadIcon className="w-5 h-5 text-slate-400 group-hover:text-violet-100 transition-colors" />
                    )}
                </div>
                <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-violet-200 transition-colors">Get</span>
              </button>

              <button
                onClick={onPlay}
                disabled={!isConnected || !fileCode || isBusy}
                className="liquid-btn group relative h-24 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.3)] hover:border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                style={{ '--liquid-color': 'rgba(16, 185, 129, 0.1)' } as React.CSSProperties}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-teal-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/20 transition-all duration-300 group-hover:scale-110 shadow-lg">
                    {isBusy && activeOperation === 'play' ? (
                        <ModernSpinner size="sm" color="#6ee7b7" />
                    ) : (
                        <PlayIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-100 transition-colors ml-0.5" />
                    )}
                </div>
                <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-emerald-200 transition-colors">Play</span>
              </button>

              <button
                onClick={onInspect}
                disabled={!isConnected || !fileCode || isBusy}
                className="liquid-btn group relative h-24 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(56,189,248,0.3)] hover:border-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                style={{ '--liquid-color': 'rgba(56, 189, 248, 0.1)' } as React.CSSProperties}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sky-600/10 via-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-sky-500/50 group-hover:bg-sky-500/20 transition-all duration-300 group-hover:scale-110 shadow-lg">
                    {isBusy && activeOperation === 'inspect' ? (
                        <ModernSpinner size="sm" color="#7dd3fc" />
                    ) : (
                        <EyeIcon className="w-5 h-5 text-slate-400 group-hover:text-sky-100 transition-colors" />
                    )}
                </div>
                <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-sky-200 transition-colors">Info</span>
              </button>

              <button
                onClick={onDelete}
                disabled={!isConnected || !fileCode || isBusy}
                className="liquid-btn group relative h-24 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.3)] hover:border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                style={{ '--liquid-color': 'rgba(244, 63, 94, 0.1)' } as React.CSSProperties}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 via-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-rose-500/50 group-hover:bg-rose-500/20 transition-all duration-300 group-hover:scale-110 shadow-lg">
                    {isBusy && activeOperation === 'scrub' ? (
                        <ModernSpinner size="sm" color="#fda4af" />
                    ) : (
                        <TrashIcon className="w-5 h-5 text-slate-400 group-hover:text-rose-100 transition-colors" />
                    )}
                </div>
                <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-rose-200 transition-colors">Del</span>
              </button>
          </div>
      </div>
    </div>
  );
}
