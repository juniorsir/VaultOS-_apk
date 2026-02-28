
import React, { useState, useEffect, memo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  EnvelopeIcon, ArrowPathIcon, ChainIcon, 
  QrCodeIcon, DocumentIcon, LockIcon, XMarkIcon, AtSymbolIcon, 
  ShieldExclamationIcon, CameraIcon
} from './Icons';
import ModernSpinner from './common/ModernSpinner';
import { useTempMail, EmailMessage, UseTempMailReturn } from '../hooks/useTempMail';

interface TempMailPanelProps extends UseTempMailReturn {
  initialSessionId?: string | null;
  initialEmail?: string | null;
}

const TempMailPanel: React.FC<TempMailPanelProps> = memo(({ 
    initialSessionId, 
    initialEmail,
    email, sessionId, messages, loading, refreshing, error, lastCreatedTime,
    createSession, refreshInbox, restoreSession, fetchMessage
}) => {
  // Internal hook call removed - using props now

  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
      if (!lastCreatedTime) {
          setTimeLeft(null);
          return;
      }

      const interval = setInterval(() => {
          const now = Date.now();
          const elapsed = now - lastCreatedTime;
          const cooldown = 5 * 60 * 1000; // 5 minutes
          const remaining = cooldown - elapsed;

          if (remaining <= 0) {
              setTimeLeft(null);
              clearInterval(interval);
          } else {
              const minutes = Math.floor(remaining / 60000);
              const seconds = Math.floor((remaining % 60000) / 1000);
              setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          }
      }, 1000);

      return () => clearInterval(interval);
  }, [lastCreatedTime]);

  // Restore session if provided via props (deep link)
  useEffect(() => {
    if (initialSessionId && !sessionId) {
        restoreSession(initialSessionId, initialEmail || undefined);
    }
  }, [initialSessionId, initialEmail, sessionId, restoreSession]);

  const handleSelectMessage = async (msg: EmailMessage) => {
      setSelectedMessage(msg);
      
      // If message doesn't have full content (text or html), fetch it
      if (!msg.text && !msg.html && !msg.preview) {
          setLoadingMessage(true);
          const fullMsg = await fetchMessage(msg.id);
          if (fullMsg) {
              setSelectedMessage(fullMsg);
          }
          setLoadingMessage(false);
      } else if (msg.preview && !msg.text && !msg.html) {
           // If we only have a preview, try to fetch full content too
           setLoadingMessage(true);
           const fullMsg = await fetchMessage(msg.id);
           if (fullMsg) {
               setSelectedMessage(fullMsg);
           }
           setLoadingMessage(false);
      }
  };

  const handleCopyEmail = async () => {
    if (email) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = email;
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
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  const getSmartContent = (text: string) => {
    if (!text) return null;

    // 1. Detect Verification Codes (4-8 digits/chars)
    const codeRegex = /\b([A-Z0-9]{4,8})\b/g;
    
    // 2. Detect Links
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const parts = text.split(/(\b[A-Z0-9]{4,8}\b|https?:\/\/[^\s]+)/g);

    return (
        <div className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-mono">
            {parts.map((part, i) => {
                if (part.match(codeRegex) && !part.match(urlRegex)) {
                    return (
                        <span key={i} className="inline-block px-2 py-0.5 mx-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold tracking-wider select-all cursor-text">
                            {part}
                        </span>
                    );
                } else if (part.match(urlRegex)) {
                    return (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 hover:underline break-all">
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </div>
    );
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto h-auto md:h-[43.75rem] flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 rounded-[24px] md:rounded-[40px] border border-white/10 shadow-2xl bg-white/[0.03] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>

        {/* QR Code Modal Overlay */}
        {showQr && sessionId && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-6 rounded-[40px] animate-in fade-in duration-200">
                
                <div className="relative w-full max-w-sm group">
                    <button 
                        onClick={() => setShowQr(false)}
                        className="absolute -top-3 -right-3 z-20 p-2 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 hover:text-white transition-colors border border-slate-600 shadow-lg"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>

                    {/* Glow Effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-[2.5rem] blur opacity-50 group-hover:opacity-100 transition duration-500"></div>

                    {/* Card Body */}
                    <div className="relative bg-white p-6 rounded-[2.2rem] shadow-2xl flex flex-col items-center gap-4">
                        
                        {/* Header */}
                        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-emerald-400">
                                    <EnvelopeIcon className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Vault</span>
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Mail</span>
                                </div>
                            </div>
                            <div className="px-2 py-1 rounded bg-slate-100 text-[10px] font-mono text-slate-500 font-bold">
                                SECURE
                            </div>
                        </div>

                        {/* QR */}
                        <div className="relative">
                            <QRCodeSVG 
                                value={`mailto:${email}`}
                                size={200}
                                level="H"
                                fgColor="#022c22"
                                bgColor="#ffffff"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.1)] border-4 border-white">
                                    <div className="w-full h-full bg-emerald-600 rounded-full flex items-center justify-center">
                                        <LockIcon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="w-full text-center border-t border-slate-100 pt-3">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1">Scan to Email</p>
                            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                                Active Session
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Left Panel: Controls & Address */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 md:gap-6 relative z-10">
            <div className="p-4 md:p-6 rounded-3xl bg-slate-950/40 border border-white/5 flex flex-col items-center text-center gap-4 relative overflow-hidden group">
                {/* Card Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                {!sessionId ? (
                    <div className="space-y-6 w-full relative z-10">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/10 shadow-xl mb-2 group-hover:scale-105 transition-transform duration-500">
                            <EnvelopeIcon className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Secure Mail</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">Generate a disposable, encrypted email address for verification codes and temporary access.</p>
                        </div>
                        
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-left animate-in fade-in zoom-in-95">
                                <ShieldExclamationIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <span className="text-xs text-red-300 font-medium break-words leading-tight">{error}</span>
                            </div>
                        )}

                        <button 
                            onClick={createSession}
                            disabled={loading || !!timeLeft}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                        >
                            {loading ? <ModernSpinner size="sm" color="white" /> : <AtSymbolIcon className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />}
                            <span>
                                {loading ? 'Connecting...' : timeLeft ? `Wait ${timeLeft}` : 'Generate Address'}
                            </span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 w-full relative z-10">
                        <div className="flex items-center justify-center gap-2 pb-2 border-b border-white/5 w-full">
                             <EnvelopeIcon className="w-4 h-4 text-emerald-500" />
                             <span className="text-xs font-bold text-white uppercase tracking-widest">Secure Mail</span>
                        </div>

                        {/* Digital Identity Card */}
                        <div className="w-full p-5 rounded-2xl bg-slate-950 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)] relative overflow-hidden group/card">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                            
                            <div className="absolute top-0 right-0 p-3 opacity-50">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 text-left relative z-10">
                                <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldExclamationIcon className="w-3 h-3" />
                                    Active Identity
                                </span>
                                <div className="relative group/copy mt-1 w-full">
                                    <button 
                                        onClick={handleCopyEmail}
                                        className="w-full text-left font-mono text-sm md:text-base text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-between bg-black/50 p-3 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                    >
                                        <span className="truncate flex-1 tracking-wider">{email || 'Loading...'}</span>
                                        <span className="opacity-0 group-hover/card:opacity-100 transition-opacity text-[10px] bg-emerald-500/20 px-2 py-1 rounded text-emerald-300 shrink-0 font-bold tracking-widest ml-2">COPY</span>
                                    </button>
                                    {copied && (
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-emerald-500 text-slate-900 text-[10px] font-bold rounded animate-in fade-in slide-in-from-bottom-2 shadow-lg z-20 whitespace-nowrap">
                                            COPIED TO CLIPBOARD
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-5 pt-4 border-t border-emerald-500/10 flex justify-between items-end relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                    <span className="text-[10px] font-mono text-emerald-500/80 tracking-widest">LIVE_CONNECTION</span>
                                </div>
                                <EnvelopeIcon className="w-10 h-10 text-emerald-500/5 absolute bottom-2 right-2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Action Grid */}
                        <div className="grid grid-cols-1 gap-3">
                            <button 
                                onClick={() => setShowQr(true)}
                                className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition-all group/action"
                            >
                                <div className="p-2 rounded-lg bg-white/5 group-hover/action:bg-emerald-500/20 transition-colors">
                                    <QrCodeIcon className="w-5 h-5" />
                                </div>
                                <span>Share Email QR</span>
                            </button>
                        </div>
                        
                        <button 
                            onClick={refreshInbox}
                            disabled={refreshing}
                            className="w-full p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 hover:border-white/20 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
                            <span>{refreshing ? 'Syncing Inbox...' : 'Force Refresh'}</span>
                        </button>
                        
                        <button 
                            onClick={() => createSession()}
                            disabled={loading || !!timeLeft}
                            className="w-full p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 hover:border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <EnvelopeIcon className="w-4 h-4" />
                            <span>{loading ? 'Generating...' : timeLeft ? `Wait ${timeLeft}` : 'Recreate Email'}</span>
                        </button>
                    </div>
                )}
            </div>
            
            {/* Status Info Bento */}
            <div className="flex-none md:flex-1 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/30 border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${sessionId ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                        <span className={`text-xs font-bold ${sessionId ? 'text-white' : 'text-slate-500'}`}>{sessionId ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/30 border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Messages</span>
                    <span className="text-lg font-mono font-bold text-white leading-none mt-1">{messages.length}</span>
                </div>
            </div>
        </div>

        {/* Right Panel: Inbox & Content */}
        <div className="w-full md:flex-1 min-h-[300px] md:min-h-0 rounded-3xl bg-slate-950/40 border border-white/5 overflow-hidden flex flex-col relative z-10">
            {!sessionId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                    <div className="w-24 h-24 rounded-full bg-slate-900/50 border border-white/5 flex items-center justify-center mb-6 relative">
                        <div className="absolute inset-0 rounded-full border border-white/5 animate-ping opacity-20"></div>
                        <LockIcon className="w-10 h-10 opacity-20" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-500 mb-2">Inbox Locked</h3>
                    <p className="text-sm max-w-xs text-slate-600">Generate a secure session to unlock real-time encrypted messaging.</p>
                </div>
            ) : (
                <>
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Feed
                        </h3>
                        {refreshing && <span className="text-[10px] font-mono text-emerald-500/80 animate-pulse">ENCRYPTED SYNC...</span>}
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Message List */}
                        <div className={`w-full md:w-1/3 border-r border-white/5 overflow-y-auto custom-scrollbar ${selectedMessage ? 'hidden md:block' : 'block'} bg-slate-900/20`}>
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-emerald-500/40 p-8 gap-6 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)]"></div>
                                    <div className="relative w-24 h-24 flex items-center justify-center">
                                        <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full"></div>
                                        <div className="absolute inset-2 border border-emerald-500/30 rounded-full animate-[spin_4s_linear_infinite] border-t-emerald-500"></div>
                                        <div className="absolute inset-6 border border-emerald-500/20 rounded-full animate-[spin_3s_linear_infinite_reverse] border-b-emerald-500"></div>
                                        <EnvelopeIcon className="w-6 h-6 text-emerald-500/50 animate-pulse" />
                                    </div>
                                    <div className="flex flex-col items-center gap-1 relative z-10">
                                        <span className="text-xs font-mono font-bold tracking-widest text-emerald-500/70">AWAITING_TRANSMISSION</span>
                                        <span className="text-[10px] font-mono text-emerald-500/40">Listening on secure channel...</span>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div 
                                        key={msg.id}
                                        onClick={() => handleSelectMessage(msg)}
                                        className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all group ${selectedMessage?.id === msg.id ? 'bg-white/5 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent hover:border-l-white/20'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedMessage?.id === msg.id ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-slate-600 group-hover:bg-emerald-400'}`}></div>
                                                <span className={`text-xs font-bold truncate ${selectedMessage?.id === msg.id ? 'text-white' : 'text-slate-300'}`} title={msg.from}>
                                                    {msg.from}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] font-mono shrink-0 ml-2 ${selectedMessage?.id === msg.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {msg.date ? new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium truncate mb-1 pl-3.5">
                                            {msg.subject || '(No Subject)'}
                                        </div>
                                        <div className="text-[10px] text-slate-600 truncate pl-3.5 group-hover:text-slate-500 transition-colors">
                                            {(msg.text || '').substring(0, 40)}...
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Message Viewer */}
                        <div className={`w-full md:w-2/3 bg-slate-900/40 flex flex-col ${!selectedMessage ? 'hidden md:flex' : 'flex'}`}>
                            {selectedMessage ? (
                                <>
                                    <div className="p-6 border-b border-white/5 flex items-start gap-4 bg-slate-900/80 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                        <button 
                                            onClick={() => setSelectedMessage(null)}
                                            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-400 tracking-widest uppercase">
                                                    Decrypted
                                                </div>
                                                <div className="px-2 py-0.5 rounded bg-slate-800 border border-white/5 text-[9px] font-mono text-slate-400 tracking-widest uppercase">
                                                    ID: {selectedMessage.id.substring(0, 8)}
                                                </div>
                                            </div>
                                            <h2 className="text-lg md:text-xl font-bold text-white mb-3 break-words leading-tight">{selectedMessage.subject}</h2>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-400">
                                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5">
                                                    <span className="text-slate-500 font-mono text-[10px] uppercase">FROM:</span>
                                                    <span className="truncate max-w-[200px] text-slate-300 font-medium">{selectedMessage.from}</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5">
                                                    <span className="text-slate-500 font-mono text-[10px] uppercase">TIME:</span>
                                                    <span className="font-mono text-slate-300">
                                                         {selectedMessage.date ? new Date(selectedMessage.date).toLocaleString() : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-gradient-to-b from-slate-900/20 to-transparent">
                                        {loadingMessage ? (
                                            <div className="h-full flex flex-col items-center justify-center gap-4">
                                                <ModernSpinner size="lg" color="emerald" />
                                                <span className="text-sm font-mono text-emerald-500/80 animate-pulse">DECRYPTING MESSAGE...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Smart Content Viewer */}
                                                <div className="prose prose-invert prose-sm max-w-none">
                                                    {getSmartContent(selectedMessage.text || '')}
                                                </div>
                                                
                                                {!selectedMessage.text && selectedMessage.html && (
                                                    <div dangerouslySetInnerHTML={{ __html: selectedMessage.html }} className="opacity-80 scale-90 origin-top-left" />
                                                )}
                                                
                                                {!selectedMessage.text && !selectedMessage.html && !selectedMessage.preview && (
                                                    <div className="text-slate-500 italic text-sm text-center mt-20 flex flex-col items-center gap-2">
                                                        <DocumentIcon className="w-8 h-8 opacity-20" />
                                                        <span>(No content in message)</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8">
                                    <div className="w-20 h-20 rounded-full bg-slate-900/50 border border-white/5 flex items-center justify-center mb-6">
                                        <DocumentIcon className="w-8 h-8 opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">Select a message to decrypt contents</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  );
});

export default TempMailPanel;
