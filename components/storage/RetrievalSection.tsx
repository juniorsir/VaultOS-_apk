
import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ChainIcon, CodeIcon, LockIcon, 
  DownloadIcon, PlayIcon, EyeIcon, TrashIcon,
  QrCodeIcon, XMarkIcon, UploadIcon
} from '../Icons';
import ModernSpinner from '../common/ModernSpinner';
import SineWaveProgress from '../common/SineWaveProgress';
import { registerBackgroundTask, notifyTaskCompletion } from '../../utils/backgroundTasks';

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
  const [showQr, setShowQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportConfig = () => {
    if (!fileCode) return;
    const config = {
      fileCode,
      downloadPassword
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-config-${fileCode.substring(0, 6)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        if (config.fileCode) setFileCode(config.fileCode);
        if (config.downloadPassword) setDownloadPassword(config.downloadPassword);
      } catch (err) {
        console.error('Failed to parse config file', err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

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

  const handleDownloadClick = async () => {
    if (!fileCode) return;
    registerBackgroundTask('sync-downloads');
    try {
      await onDownload();
      notifyTaskCompletion('Download Complete', {
        body: `File ${fileCode} has been securely downloaded.`,
      });
    } catch (error) {
      notifyTaskCompletion('Download Failed', {
        body: `Failed to download file ${fileCode}.`,
      });
    }
  };

  return (
    <div className="relative p-6 rounded-[30px] border border-white/5 bg-white/[0.02] backdrop-blur-sm flex flex-col h-full">
      
      {/* QR Code Modal */}
      {showQr && fileCode && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center animate-in fade-in duration-300 px-8 rounded-[30px]">
           <button 
             onClick={() => setShowQr(false)}
             className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
           >
             <XMarkIcon className="w-5 h-5" />
           </button>
           
           <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-violet-500/20 mb-4">
             <QRCodeSVG 
               value={`${window.location.origin}${window.location.pathname}?v=${fileCode}`}
               size={180}
               level="H"
               includeMargin={false}
             />
           </div>
           
           <h3 className="text-white font-bold text-lg mb-1">Scan to Access</h3>
           <p className="text-slate-400 text-xs text-center max-w-[200px]">
             Use a secure scanner to retrieve this file on another device.
           </p>
        </div>
      )}

      {/* Download Progress Overlay */}
      {isBusy && activeOperation === 'download' && (
         <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center animate-in fade-in duration-300 px-8 rounded-[30px]">
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

      <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Retrieve File</h2>
            {fileCode && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowQr(true)}
                  className="flex items-center justify-center w-12 h-12 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 shadow-md hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:border-violet-500/50 group overflow-hidden relative"
                  aria-label="Show QR Code"
                >
                  <div className="absolute inset-0 bg-violet-400/10 scale-0 group-hover:scale-100 rounded-full transition-transform duration-300" />
                  <QrCodeIcon className="w-6 h-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10" />
                </button>
                <button 
                  onClick={copyShareLink}
                  className="flex items-center gap-2 px-5 py-3 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 rounded-full text-xs font-bold uppercase tracking-wider border border-violet-500/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 shadow-md hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:border-violet-500/50 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0 pointer-events-none" />
                  <ChainIcon className="w-4 h-4 group-hover:scale-110 transition-transform relative z-10" />
                  <span className="relative z-10">{shareLinkCopied ? 'Copied' : 'Share Link'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-grow flex flex-col justify-center space-y-6">
               <div className="flex justify-between items-end mb-2">
                 <div className="flex gap-2">
                   <button
                     onClick={() => fileInputRef.current?.click()}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10 transition-colors"
                   >
                     <UploadIcon className="w-3.5 h-3.5" />
                     Import Config
                   </button>
                   <input 
                     type="file" 
                     accept=".json" 
                     className="hidden" 
                     ref={fileInputRef} 
                     onChange={handleImportConfig} 
                   />
                   {fileCode && (
                     <button
                       onClick={handleExportConfig}
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10 transition-colors"
                     >
                       <DownloadIcon className="w-3.5 h-3.5" />
                       Export Config
                     </button>
                   )}
                 </div>
               </div>
               <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">File Code</label>
                   <div className="relative group/input">
                       <input
                        type="text"
                        value={fileCode}
                        onChange={(e) => setFileCode(e.target.value)}
                        placeholder="Enter secure code..."
                        disabled={!isConnected}
                        aria-label="File Code"
                        className="w-full h-12 pl-10 pr-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50 focus:ring-1 focus:ring-violet-500/20 font-mono text-sm shadow-inner transition-all duration-300"
                      />
                      <div className="absolute left-3 top-3.5 text-slate-600 group-focus-within/input:text-violet-400 transition-colors">
                          <CodeIcon className="w-5 h-5" />
                      </div>
                   </div>
               </div>
               
               <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Decryption Password (If Required)</label>
                   <div className="relative group/input">
                       <input
                        type="password"
                        value={downloadPassword}
                        onChange={(e) => setDownloadPassword(e.target.value)}
                        placeholder="Enter password..."
                        disabled={!isConnected}
                        aria-label="Password"
                        className="w-full h-12 pl-10 pr-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50 focus:ring-1 focus:ring-violet-500/20 font-mono text-sm shadow-inner transition-all duration-300"
                      />
                      <div className="absolute left-3 top-3.5 text-slate-600 group-focus-within/input:text-violet-400 transition-colors">
                          <LockIcon className="w-5 h-5" />
                      </div>
                   </div>
               </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-auto">
              <button
                onClick={handleDownloadClick}
                disabled={!isConnected || !fileCode || isBusy}
                className="group relative h-24 md:h-32 lg:h-40 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.3)] hover:border-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Download File"
              >
                {/* Hover Shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 pointer-events-none" />
                
                {/* Loading Pulse Background */}
                {isBusy && activeOperation === 'download' && (
                    <div className="absolute inset-0 bg-violet-500/10 animate-pulse z-0" />
                )}

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
                className="group relative h-24 md:h-32 lg:h-40 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.3)] hover:border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Play Media"
              >
                {/* Hover Shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 pointer-events-none" />
                
                {/* Loading Pulse Background */}
                {isBusy && activeOperation === 'play' && (
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse z-0" />
                )}

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
                className="group relative h-24 md:h-32 lg:h-40 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(56,189,248,0.3)] hover:border-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Inspect File Metadata"
              >
                {/* Hover Shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 pointer-events-none" />
                
                {/* Loading Pulse Background */}
                {isBusy && activeOperation === 'inspect' && (
                    <div className="absolute inset-0 bg-sky-500/10 animate-pulse z-0" />
                )}

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
                className="group relative h-24 md:h-32 lg:h-40 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/40 border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.3)] hover:border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Delete File"
              >
                {/* Hover Shimmer */}
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-20 pointer-events-none" />
                
                {/* Loading Pulse Background */}
                {isBusy && activeOperation === 'scrub' && (
                    <div className="absolute inset-0 bg-rose-500/10 animate-pulse z-0" />
                )}

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
