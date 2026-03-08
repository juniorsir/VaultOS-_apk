
import React, { useState, useRef, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  WifiIcon, ChainIcon, XMarkIcon, 
  UploadIcon, DownloadIcon, ShieldCheckIcon, DocumentIcon, QrCodeIcon, ArrowPathIcon,
  PaperAirplaneIcon, ClockIcon, CloudIcon
} from './Icons';
import ModernSpinner from './common/ModernSpinner';
import QRScanner from './common/QRScanner';
import { useWebRTC } from '../context/WebRTCContext';

const AirDropPanel: React.FC = memo(() => {
  const { 
    status, roomId, error, isHost, transfers, 
    createSession, joinSession, sendFile, disconnect 
  } = useWebRTC();

  const [joinCode, setJoinCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [signalStrength, setSignalStrength] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simulate signal strength when connected
  useEffect(() => {
    if (status === 'CONNECTED' || status === 'TRANSFERRING') {
      setSignalStrength(4); // Start strong
      const interval = setInterval(() => {
        // Simulate slight fluctuation between 3 and 4 bars
        setSignalStrength(3 + Math.round(Math.random() * 0.7)); 
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setSignalStrength(0);
    }
  }, [status]);

  // Auto-scroll to bottom of transfer list
  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transfers.length]);

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
    return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        sendFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'CONNECTED' || status === 'TRANSFERRING') {
        setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === 'CONNECTED' || status === 'TRANSFERRING') {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if ((status === 'CONNECTED' || status === 'TRANSFERRING') && e.dataTransfer.files && e.dataTransfer.files[0]) {
      sendFile(e.dataTransfer.files[0]);
    }
  };

  const copyRoomId = async () => {
      if(roomId) {
        try {
          const url = `${window.location.origin}?roomId=${roomId}`;
          await navigator.clipboard.writeText(url);
        } catch (err) {
          console.error('Failed to copy', err);
        }
      }
  };

  const handleScan = (data: string) => {
      if (data) {
          setJoinCode(data);
          setShowScanner(false);
          if (data.length === 6) {
              joinSession(data);
          }
      }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto min-h-[37.5rem] flex flex-col p-4 md:p-8 rounded-[40px] border border-white/10 shadow-2xl bg-white/[0.03] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
        
        {/* QR Scanner Overlay */}
        {showScanner && (
            <QRScanner 
                onScan={handleScan} 
                onClose={() => setShowScanner(false)} 
                title="Scan P2P Identity"
            />
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-6 border-b border-white/5 pb-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl border transition-all duration-500 relative overflow-hidden ${
                    ['CONNECTED', 'TRANSFERRING'].includes(status) 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-800/50 border-white/10 text-slate-400'
                }`}>
                    <div className={`absolute inset-0 bg-emerald-400/20 blur-xl rounded-full transition-opacity duration-500 ${['CONNECTED', 'TRANSFERRING'].includes(status) ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                    <WifiIcon className="w-6 h-6 relative z-10" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                        Vault P2P Share
                        {/* Signal Strength Indicator */}
                        {['CONNECTED', 'TRANSFERRING'].includes(status) && (
                            <div className="flex items-end gap-0.5 h-3 ml-1" title="Signal Strength: Strong">
                                {[1, 2, 3, 4].map(bar => (
                                    <div 
                                        key={bar} 
                                        className={`w-1 rounded-sm transition-all duration-500 ${
                                            bar <= signalStrength 
                                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                                            : 'bg-slate-800/50'
                                        }`}
                                        style={{ height: `${bar * 25}%` }}
                                    />
                                ))}
                            </div>
                        )}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] transition-colors duration-300 ${
                            status === 'IDLE' ? 'bg-slate-500 text-slate-500 shadow-none' : 
                            status === 'CONNECTED' || status === 'TRANSFERRING' ? 'bg-emerald-500 text-emerald-500 animate-pulse' :
                            'bg-violet-500 text-violet-500 animate-pulse'
                        }`}></span>
                        <p className={`text-xs font-mono uppercase tracking-wider transition-colors duration-300 ${
                            status === 'CONNECTED' || status === 'TRANSFERRING' ? 'text-emerald-400 font-bold' : 'text-slate-500'
                        }`}>
                            {status === 'IDLE' && 'Ready to Connect'}
                            {(status === 'CREATING' || status === 'PAIRING') && 'Broadcasting Signal...'}
                            {status === 'CONNECTING' && 'Handshaking...'}
                            {(status === 'CONNECTED' || status === 'TRANSFERRING') && 'Secure Session Active'}
                        </p>
                    </div>
                </div>
            </div>
            
            {status !== 'IDLE' && (
                <button 
                    onClick={disconnect}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all group"
                    title="Disconnect"
                    aria-label="Disconnect Session"
                >
                    <XMarkIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col w-full overflow-hidden">
            <AnimatePresence mode="wait">
            {/* Error Banner */}
            {error && (
                <motion.div 
                    key="error"
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="absolute top-0 left-0 right-0 mx-auto max-w-md p-4 bg-red-950 border border-red-500/20 rounded-2xl text-red-300 text-sm text-center mb-6 shadow-lg shadow-red-900/10 z-50"
                >
                    <div className="flex items-center justify-center gap-2 font-bold mb-1">
                        <XMarkIcon className="w-4 h-4" /> Connection Error
                    </div>
                    {error}
                </motion.div>
            )}

            {/* IDLE STATE */}
            {status === 'IDLE' && (
                <motion.div 
                    key="idle"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full max-w-4xl mx-auto my-auto"
                >
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
                                    aria-label="Enter 6-digit Join Code"
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-center font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 uppercase tracking-widest text-sm"
                                />
                                <button 
                                    onClick={() => joinSession(joinCode)}
                                    disabled={joinCode.length < 4}
                                    className="px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                                >
                                    Join
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* CREATING/PAIRING STATE */}
            {(status === 'CREATING' || status === 'PAIRING') && (
                <motion.div 
                    key="creating"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="flex flex-col items-center justify-center w-full h-full"
                >
                    {status === 'CREATING' && !roomId ? (
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                {/* Cloud Environment Animation */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    {/* Floating Particles */}
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-1.5 h-1.5 bg-violet-400/60 rounded-full"
                                            initial={{ y: 40, x: (i - 2) * 20, opacity: 0, scale: 0 }}
                                            animate={{
                                                y: -40,
                                                opacity: [0, 1, 0],
                                                scale: [0, 1, 0],
                                            }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 2 + Math.random(),
                                                delay: i * 0.3,
                                                ease: "easeInOut",
                                            }}
                                        />
                                    ))}
                                    {/* Pulse Effect */}
                                    <motion.div
                                        className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                </div>
                                <div className="relative z-10 bg-slate-900 p-6 rounded-full border border-violet-500/30 shadow-xl shadow-violet-900/20">
                                    <CloudIcon className="w-12 h-12 text-violet-400" />
                                    <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-violet-500/30">
                                        <ModernSpinner size="sm" color="#8b5cf6" />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-white mb-1">Initializing Cloud Environment</h3>
                                <p className="text-slate-400 font-mono text-xs">Allocating secure ephemeral storage...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div 
                                className="relative group cursor-pointer mb-8" 
                                onClick={copyRoomId}
                                role="button"
                                aria-label="Copy Session ID"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && copyRoomId()}
                            >
                                <div className="absolute -inset-1 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-[2.5rem] blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                                <div className="relative bg-white p-8 rounded-[2.2rem] shadow-2xl flex flex-col items-center gap-6 border border-white/20">
                                    <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-violet-400">
                                                <CloudIcon className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Vault</span>
                                                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest leading-none">Cloud Link</span>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 rounded bg-slate-100 text-[10px] font-mono text-slate-500 font-bold tracking-wider">SECURE</div>
                                    </div>
                                    <div className="relative p-2 bg-white rounded-xl">
                                        <QRCodeSVG 
                                            value={`${window.location.origin}?roomId=${roomId}`} 
                                            size={220} 
                                            level="H" 
                                            fgColor="#0f172a" 
                                            bgColor="#ffffff" 
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.1)] border-4 border-white">
                                                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                                                    <CloudIcon className="w-8 h-8 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full text-center border-t border-slate-100 pt-4">
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1.5">Cloud Session ID</p>
                                        <div className="text-3xl font-black text-slate-900 font-mono tracking-widest bg-slate-100/50 rounded-lg py-1">{roomId}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center space-y-4">
                                <div className="flex flex-col items-center gap-2">
                                    <h3 className="text-white font-bold text-lg">Syncing with Cloud...</h3>
                                    <p className="text-slate-400 text-sm">Scan QR or share link to join session</p>
                                </div>
                                <div className="flex items-center justify-center gap-3 px-5 py-2 rounded-full bg-slate-800/50 border border-white/5 w-fit mx-auto">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Waiting for Peer</span>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* CONNECTING STATE */}
            {status === 'CONNECTING' && (
                <motion.div 
                    key="connecting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                    className="flex flex-col items-center justify-center h-full relative overflow-hidden"
                >
                    {/* Cloud Sync Waves */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full border border-violet-500/20 bg-violet-500/5"
                                initial={{ width: 100, height: 100, opacity: 0 }}
                                animate={{
                                    width: [100, 400],
                                    height: [100, 400],
                                    opacity: [0.6, 0],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 3,
                                    delay: i * 1,
                                    ease: "easeOut",
                                }}
                            />
                        ))}
                    </div>

                    {/* Central Cloud Icon */}
                    <div className="relative z-10 mb-8">
                        <div className="w-24 h-24 bg-slate-900 rounded-full border border-violet-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)] relative">
                             <div className="absolute inset-0 bg-violet-500/20 rounded-full animate-pulse"></div>
                             <CloudIcon className="w-10 h-10 text-white relative z-10" />
                             
                             {/* Orbiting particle */}
                             <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-[-10px] rounded-full"
                             >
                                <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)] absolute top-0 left-1/2 -translate-x-1/2"></div>
                             </motion.div>
                        </div>
                    </div>

                    <div className="relative z-10 text-center space-y-3">
                        <motion.h3 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl font-bold text-white tracking-tight"
                        >
                            Establishing Cloud Link
                        </motion.h3>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-sm text-slate-400 font-mono flex items-center justify-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-200"></span>
                            <span className="ml-2">Secure Handshake in Progress</span>
                        </motion.p>
                    </div>
                </motion.div>
            )}

            {/* CONNECTED / SESSION VIEW */}
            {(status === 'CONNECTED' || status === 'TRANSFERRING' || status === 'COMPLETED') && (
                <motion.div 
                    key="connected"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="flex flex-col h-full gap-4"
                >
                    {/* Success Banner */}
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-900/10"
                    >
                        <ShieldCheckIcon className="w-4 h-4" />
                        Handshake Complete &bull; Channel Secure
                    </motion.div>
                    
                    {/* Transfer History List */}
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 custom-scrollbar">
                        {transfers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                <PaperAirplaneIcon className="w-12 h-12 mb-3" />
                                <p className="text-sm font-medium">Session Ready</p>
                                <p className="text-xs">Send a file to start the conversation</p>
                            </div>
                        ) : (
                            transfers.map((transfer) => (
                                <div 
                                    key={transfer.id} 
                                    className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                                        transfer.status === 'transferring' 
                                        ? 'bg-slate-800/80 border-violet-500/30 shadow-lg shadow-violet-900/10' 
                                        : 'bg-slate-800/40 border-white/5'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${
                                            transfer.type === 'sending' 
                                            ? 'bg-violet-500/10 text-violet-400' 
                                            : 'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                            {transfer.type === 'sending' ? <UploadIcon className="w-6 h-6" /> : <DownloadIcon className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-bold text-white truncate pr-4" title={transfer.fileName}>
                                                    {transfer.fileName}
                                                </h4>
                                                <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                                                    {formatBytes(transfer.fileSize)}
                                                </span>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            <div className="mt-3 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className={`h-full transition-all duration-300 ${
                                                        transfer.status === 'completed' 
                                                        ? 'bg-emerald-500' 
                                                        : transfer.status === 'error' 
                                                        ? 'bg-red-500' 
                                                        : 'bg-violet-500'
                                                    }`}
                                                    style={{ width: `${transfer.progress}%` }}
                                                ></div>
                                            </div>

                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-2">
                                                    {transfer.status === 'transferring' && (
                                                        <span className="text-[10px] font-mono text-violet-300 animate-pulse">
                                                            {formatSpeed(transfer.speed)}
                                                        </span>
                                                    )}
                                                    {transfer.status === 'completed' && (
                                                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                                            <ShieldCheckIcon className="w-3 h-3" /> Completed
                                                        </span>
                                                    )}
                                                    {transfer.status === 'error' && (
                                                        <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                                                            <XMarkIcon className="w-3 h-3" /> Failed
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-600">
                                                    {new Date(transfer.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="mt-auto pt-4 border-t border-white/5">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            role="button"
                            aria-label="Select file to upload"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                            className={`relative w-full h-24 rounded-2xl border-2 border-dashed flex items-center justify-center gap-4 transition-all duration-200 cursor-pointer group overflow-hidden ${
                                isDragging 
                                ? 'border-violet-500 bg-violet-500/10' 
                                : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 hover:border-violet-500/30'
                            }`}
                        >
                            <div className={`p-2 rounded-full transition-all ${isDragging ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-violet-500/20 group-hover:text-violet-300'}`}>
                                <UploadIcon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className={`text-sm font-bold transition-colors ${isDragging ? 'text-violet-300' : 'text-slate-300 group-hover:text-white'}`}>
                                    {isDragging ? 'Drop to Send' : 'Send New File'}
                                </p>
                                <p className="text-xs text-slate-500">Click or drag file here</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    </div>
  );
});

export default AirDropPanel;
