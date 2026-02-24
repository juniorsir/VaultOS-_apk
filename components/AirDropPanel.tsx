
import React, { useState, useRef, memo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  WifiIcon, ChainIcon, XMarkIcon, 
  UploadIcon, DownloadIcon, ShieldCheckIcon, DocumentIcon, QrCodeIcon, ArrowPathIcon
} from './Icons';
import ModernSpinner from './common/ModernSpinner';
import QRScanner from './common/QRScanner';
import { useWebRTC } from '../hooks/useWebRTC';

const AirDropPanel: React.FC = memo(() => {
  const { 
    status, roomId, error, isHost, progress, transferSpeed, 
    fileName, transferType, createSession, joinSession, sendFile, disconnect 
  } = useWebRTC();

  const [joinCode, setJoinCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
    return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        sendFile(e.target.files[0]);
    }
  };

  const copyRoomId = async () => {
      if(roomId) {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(roomId);
          } else {
            const textArea = document.createElement("textarea");
            textArea.value = roomId;
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
        } catch (err) {
          console.error('Failed to copy', err);
        }
      }
  };

  const handleScan = (data: string) => {
      if (data) {
          setJoinCode(data);
          setShowScanner(false);
          // Auto-join if code looks valid (6 chars)
          if (data.length === 6) {
              joinSession(data);
          }
      }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto min-h-[600px] flex flex-col p-4 md:p-8 rounded-[40px] border border-white/10 shadow-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden glass-animate">
        
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[100px]"></div>
        </div>

        {/* QR Scanner Overlay */}
        {showScanner && (
            <QRScanner 
                onScan={handleScan} 
                onClose={() => setShowScanner(false)} 
                title="Scan P2P Identity"
            />
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl border transition-colors duration-500 ${
                    ['CONNECTED', 'TRANSFERRING'].includes(status) 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-800/50 border-white/10 text-slate-400'
                }`}>
                    <WifiIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Vault P2P Share</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${status === 'IDLE' ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                            {status === 'IDLE' && 'Ready to Connect'}
                            {(status === 'CREATING' || status === 'PAIRING') && 'Broadcasting Signal...'}
                            {status === 'CONNECTING' && 'Handshaking...'}
                            {status === 'CONNECTED' && 'Secure Tunnel Active'}
                            {status === 'TRANSFERRING' && 'Data Stream Active'}
                            {status === 'COMPLETED' && 'Transfer Finalized'}
                        </p>
                    </div>
                </div>
            </div>
            
            {status !== 'IDLE' && (
                <button 
                    onClick={disconnect}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all group"
                    title="Disconnect"
                >
                    <XMarkIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
            
            {/* Error Banner */}
            {error && (
                <div className="absolute top-0 left-0 right-0 mx-auto max-w-md p-4 bg-red-950/40 border border-red-500/20 rounded-2xl text-red-300 text-sm text-center mb-6 animate-in fade-in slide-in-from-top-2 backdrop-blur-md shadow-lg shadow-red-900/10">
                    <div className="flex items-center justify-center gap-2 font-bold mb-1">
                        <XMarkIcon className="w-4 h-4" /> Connection Error
                    </div>
                    {error}
                </div>
            )}

            {/* IDLE STATE: Selection Cards */}
            {status === 'IDLE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full max-w-4xl">
                    {/* SEND CARD */}
                    <button 
                        onClick={createSession}
                        className="group relative flex flex-col items-center justify-center p-8 rounded-[30px] bg-slate-800/20 border border-white/5 hover:bg-slate-800/40 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/10"
                    >
                        <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-violet-500/50 transition-all duration-500 shadow-inner">
                            <UploadIcon className="w-8 h-8 text-violet-400 group-hover:text-violet-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Send File</h3>
                        <p className="text-sm text-slate-400 text-center max-w-[200px] leading-relaxed">
                            Generate a secure, one-time room to broadcast files.
                        </p>
                        <div className="mt-6 px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-300 text-[10px] font-bold uppercase tracking-widest border border-violet-500/20 group-hover:bg-violet-500/20 transition-colors">
                            Host Session
                        </div>
                    </button>

                    {/* RECEIVE CARD */}
                    <div className="relative flex flex-col p-8 rounded-[30px] bg-slate-800/20 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 group">
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-emerald-500/50 transition-all duration-500 shadow-inner">
                                <DownloadIcon className="w-8 h-8 text-emerald-400 group-hover:text-emerald-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Receive File</h3>
                            <p className="text-sm text-slate-400 max-w-[200px] leading-relaxed">
                                Join an existing room via code or QR.
                            </p>
                        </div>

                        <div className="w-full mt-6 space-y-3">
                            <button 
                                onClick={() => setShowScanner(true)}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition-all font-bold text-sm group/scan"
                            >
                                <QrCodeIcon className="w-4 h-4 group-hover/scan:text-emerald-400 transition-colors" />
                                Scan QR Identity
                            </button>
                            
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter 6-digit Code" 
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-center font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 uppercase tracking-widest text-sm"
                                />
                                <button 
                                    onClick={() => joinSession(joinCode)}
                                    disabled={joinCode.length < 4}
                                    className="liquid-btn px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                                    style={{ '--liquid-color': 'rgba(255, 255, 255, 0.2)' } as React.CSSProperties}
                                >
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATING STATE: Skeleton Loading (Construction Effect - Slow & Responsive) */}
            {status === 'CREATING' && !roomId && (
                <div className="flex flex-col items-center justify-center w-full py-4 md:py-8 animate-in fade-in duration-700">
                    {/* Skeleton Card */}
                    <div className="relative w-full max-w-[300px] sm:max-w-[340px] bg-white p-6 sm:p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-6 border border-white/20 opacity-90 transition-all duration-500">
                        {/* Shimmer Overlay - Slower */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 z-20 pointer-events-none rounded-[2rem] animate-[pulse_3s_ease-in-out_infinite]"></div>

                        {/* Skeleton Header */}
                        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4 z-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse duration-[2000ms]"></div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="h-2 w-12 bg-slate-100 rounded animate-pulse duration-[2000ms] delay-100"></div>
                                    <div className="h-2 w-16 bg-slate-100 rounded animate-pulse duration-[2000ms] delay-200"></div>
                                </div>
                            </div>
                            <div className="w-12 h-5 rounded bg-slate-100 animate-pulse duration-[2000ms]"></div>
                        </div>

                        {/* Construction QR Area - Responsive Size */}
                        <div className="relative w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] p-2 flex items-center justify-center">
                             
                             {/* The Grid Construction */}
                             <div className="w-full h-full grid grid-cols-12 grid-rows-12 gap-0.5 sm:gap-1 relative z-0">
                                {Array.from({ length: 144 }).map((_, i) => {
                                    const r = Math.floor(i / 12);
                                    const c = i % 12;
                                    const isCorner = (r < 4 && c < 4) || (r < 4 && c > 7) || (r > 7 && c < 4);
                                    
                                    if (isCorner) return <div key={i}></div>;

                                    return (
                                        <div 
                                            key={i} 
                                            className="bg-slate-800 rounded-[0.5px]"
                                            style={{ 
                                                opacity: Math.random() > 0.6 ? 0 : 0.1,
                                                // Much slower animation (2-4s)
                                                animation: `pulse ${2 + Math.random() * 2}s cubic-bezier(0.4, 0, 0.6, 1) infinite` 
                                            }}
                                        ></div>
                                    );
                                })}
                             </div>

                             {/* Finder Patterns (Constructing) - Slower Animations */}
                             {/* Top Left */}
                             <div className="absolute top-2 left-2 w-[55px] h-[55px] sm:w-[65px] sm:h-[65px] border-4 border-slate-800 rounded-lg flex items-center justify-center animate-[pulse_3s_infinite]">
                                 <div className="w-3/5 h-3/5 bg-slate-800 rounded-md"></div>
                             </div>
                             {/* Top Right */}
                             <div className="absolute top-2 right-2 w-[55px] h-[55px] sm:w-[65px] sm:h-[65px] border-4 border-slate-800 rounded-lg flex items-center justify-center animate-[pulse_3s_infinite] delay-150">
                                 <div className="w-3/5 h-3/5 bg-slate-800 rounded-md"></div>
                             </div>
                             {/* Bottom Left */}
                             <div className="absolute bottom-2 left-2 w-[55px] h-[55px] sm:w-[65px] sm:h-[65px] border-4 border-slate-800 rounded-lg flex items-center justify-center animate-[pulse_3s_infinite] delay-300">
                                 <div className="w-3/5 h-3/5 bg-slate-800 rounded-md"></div>
                             </div>

                             {/* Center Logo - Slower bounce */}
                             <div className="absolute inset-0 flex items-center justify-center z-20">
                                 <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-2xl flex items-center justify-center border-4 border-white shadow-lg animate-[bounce_2s_infinite]">
                                     <ChainIcon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
                                 </div>
                             </div>
                        </div>

                        {/* Skeleton Footer */}
                        <div className="w-full flex flex-col items-center gap-2 border-t border-slate-100 pt-4 z-0">
                            <div className="h-2 w-16 bg-slate-100 rounded animate-pulse duration-[2000ms]"></div>
                            <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse duration-[2000ms] delay-100"></div>
                        </div>
                    </div>
                    
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <div className="h-3 w-32 sm:w-40 bg-slate-700/50 rounded animate-pulse duration-[2000ms]"></div>
                        <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-[bounce_1.5s_infinite]"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-[bounce_1.5s_infinite] delay-200"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-[bounce_1.5s_infinite] delay-400"></span>
                        </div>
                    </div>
                </div>
            )}

            {/* PAIRING STATE: Show QR */}
            {(status === 'PAIRING' || (status === 'CREATING' && roomId)) && isHost && roomId && (
                <div className="flex flex-col items-center animate-in fade-in duration-500">
                    
                    {/* Branded Identity Card */}
                    <div className="relative group cursor-pointer mb-8" onClick={copyRoomId}>
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-[2.5rem] blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                        
                        {/* Card Body */}
                        <div className="relative bg-white p-8 rounded-[2.2rem] shadow-2xl flex flex-col items-center gap-6 border border-white/20">
                            
                            {/* Card Header */}
                            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-violet-400">
                                        <WifiIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Vault</span>
                                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest leading-none">ID Card</span>
                                    </div>
                                </div>
                                <div className="px-2 py-1 rounded bg-slate-100 text-[10px] font-mono text-slate-500 font-bold tracking-wider">
                                    DIRECT
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="relative p-2 bg-white rounded-xl">
                                <QRCodeSVG 
                                    value={roomId} 
                                    size={220}
                                    level="H"
                                    fgColor="#0f172a"
                                    bgColor="#ffffff"
                                />
                                {/* Center Icon Badge */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.1)] border-4 border-white">
                                        <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                                            <ChainIcon className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="w-full text-center border-t border-slate-100 pt-4">
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1.5">Session ID</p>
                                <div className="text-3xl font-black text-slate-900 font-mono tracking-widest bg-slate-100/50 rounded-lg py-1">{roomId}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center space-y-4">
                        <p className="text-slate-400 text-sm">Scan with peer device to connect</p>
                        <div className="flex items-center justify-center gap-3 px-5 py-2 rounded-full bg-slate-800/50 border border-white/5 w-fit mx-auto">
                            <ModernSpinner size="sm" color="#8b5cf6" />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Waiting for peer...</span>
                        </div>
                    </div>
                </div>
            )}

            {status === 'CONNECTING' && (
                <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
                    <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/20 rounded-full animate-ping duration-1000"></div>
                        <div className="absolute inset-0 bg-violet-500/10 rounded-full animate-ping duration-[1.5s] delay-150"></div>
                        <div className="relative p-8 bg-slate-900 rounded-full border border-violet-500/50 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                            <ModernSpinner size="xl" color="#a78bfa" className="absolute inset-0 scale-150 opacity-20" />
                            <ChainIcon className="w-12 h-12 text-violet-400 animate-pulse relative z-10" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-white">Establishing Secure Handshake</h3>
                        <p className="text-sm text-slate-400 font-mono">Exchanging ICE candidates...</p>
                    </div>
                </div>
            )}

            {/* CONNECTED / TRANSFERRING STATE */}
            {['CONNECTED', 'TRANSFERRING', 'COMPLETED'].includes(status) && (
                <div className="w-full max-w-lg flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
                    
                    {/* Status Pill */}
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-slate-800/50 border border-white/10 backdrop-blur-md">
                        <div className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'TRANSFERRING' ? 'bg-violet-400' : 'bg-emerald-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'TRANSFERRING' ? 'bg-violet-500' : 'bg-emerald-500'}`}></span>
                        </div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {status === 'CONNECTED' ? 'Peer Connected' : status === 'TRANSFERRING' ? 'Transferring Data' : 'Transfer Complete'}
                        </span>
                    </div>

                    {!transferType && status !== 'COMPLETED' ? (
                        <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-56 rounded-[30px] border-2 border-dashed border-slate-700 hover:border-violet-500 hover:bg-violet-500/5 flex flex-col items-center justify-center gap-5 transition-all duration-300 group relative overflow-hidden"
                             >
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                <div className="relative z-10 w-20 h-20 rounded-full bg-slate-800 group-hover:bg-violet-500 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xl group-hover:scale-110 group-hover:shadow-violet-500/30">
                                    <UploadIcon className="w-8 h-8" />
                                </div>
                                <div className="relative z-10 text-center">
                                    <h3 className="text-xl font-bold text-slate-300 group-hover:text-white mb-1">Click to Send File</h3>
                                    <p className="text-sm text-slate-500 group-hover:text-violet-200/70">Secure Direct Tunnel Ready</p>
                                </div>
                             </button>
                        </div>
                    ) : (
                        <div className="w-full p-1 rounded-[30px] bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="bg-slate-900/90 rounded-[26px] p-6 relative overflow-hidden">
                                {status === 'COMPLETED' && (
                                    <div className="absolute inset-0 bg-emerald-900/10 z-0 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 to-transparent"></div>
                                    </div>
                                )}
                                
                                <div className="relative z-10 flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl shadow-lg transition-all duration-500 ${status === 'COMPLETED' ? 'bg-emerald-500 text-white rotate-0' : 'bg-slate-800 text-slate-400 rotate-3'}`}>
                                            {status === 'COMPLETED' ? (
                                                <ShieldCheckIcon className="w-8 h-8" />
                                            ) : (
                                                <DocumentIcon className="w-8 h-8" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-lg font-bold text-white truncate max-w-[200px]" title={fileName || ''}>{fileName}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-violet-500 animate-pulse'}`}></span>
                                                {status === 'COMPLETED' ? (
                                                    <span className="text-emerald-400 font-bold">SUCCESSFULLY VERIFIED</span>
                                                ) : (
                                                    <>
                                                        <span className="uppercase">{transferType === 'sending' ? 'Uploading' : 'Downloading'}</span>
                                                        <span className="text-slate-600">|</span>
                                                        <span className="text-slate-300">{formatSpeed(transferSpeed)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 font-mono tracking-tighter">
                                            {Math.round(progress)}%
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="relative z-10 h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <div 
                                        className={`h-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden ${status === 'COMPLETED' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]'}`}
                                        style={{ width: `${progress}%` }}
                                    >
                                        {status === 'TRANSFERRING' && (
                                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite] skew-x-12"></div>
                                        )}
                                    </div>
                                </div>

                                {status === 'COMPLETED' && (
                                    <button 
                                        onClick={() => {
                                            disconnect(); 
                                        }}
                                        className="liquid-btn relative z-10 mt-8 w-full py-4 bg-white text-slate-950 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-white/10 active:scale-[0.98] uppercase tracking-wider text-sm flex items-center justify-center gap-2 group"
                                        style={{ '--liquid-color': 'rgba(16, 185, 129, 0.2)' } as React.CSSProperties}
                                    >
                                        <ArrowPathIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                        Start New Transfer
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
});

export default AirDropPanel;
