import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  XMarkIcon, DownloadIcon, TrashIcon, PlayIcon, PauseIcon,
  ShieldCheckIcon, ShieldExclamationIcon,
  BugIcon, ActivityIcon, TerminalIcon, ChainIcon,
  ImageIcon, VideoIcon, MusicIcon, CodeIcon, DocumentIcon,
  ArrowPathIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ShieldCheckIcon as ShieldIcon,
  LockIcon, HandshakeIcon, ArrowRightIcon, ArrowsPointingOutIcon, QrCodeIcon
} from '../Icons';
import Spinner from '../common/Spinner';
import { FileInfo, ForensicReport } from '../../types';
import { registerBackgroundTask, notifyTaskCompletion } from '../../utils/backgroundTasks';

interface FilePreviewProps {
  onBack: () => void;
  fileCode: string;
  fileInfo: FileInfo | null;
  forensicReport: ForensicReport | null;
  isBusy: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onScrub: () => void;
  onPreview: (password?: string) => Promise<{ url: string, type: string } | { error: string } | null>;
  isSharedLink?: boolean;
  onExportConfig?: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  onBack, fileCode, fileInfo, forensicReport,
  isBusy, onDownload, onDelete, onScrub, onPreview, isSharedLink, onExportConfig
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  
  const handleDownloadClick = async () => {
    registerBackgroundTask('sync-downloads');
    try {
      await onDownload();
      notifyTaskCompletion('Download Complete', {
        body: `File ${fileInfo?.filename || fileCode} has been securely downloaded.`,
      });
    } catch (error) {
      notifyTaskCompletion('Download Failed', {
        body: `Failed to download file ${fileInfo?.filename || fileCode}.`,
      });
    }
  };

  // Latency Simulation
  const [latency, setLatency] = useState(24);

  useEffect(() => {
    const interval = setInterval(() => {
        setLatency(prev => {
            const jitter = Math.floor(Math.random() * 9) - 4; // -4 to +4
            return Math.min(Math.max(prev + jitter, 14), 68); // Keep between 14ms and 68ms
        });
    }, 1500);
    return () => clearInterval(interval);
  }, []);
  
  // Media Control State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  
  // Track auto-load attempts to prevent loops
  const autoLoadRef = useRef<string | null>(null);

  // Clean up URL on unmount
  useEffect(() => {
      return () => {
          if (previewUrl && previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl);
          }
      };
  }, [previewUrl]);
  
  // Reset media state when preview changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsMetadataLoaded(false);
    setIsBuffering(true);
  }, [previewUrl]);

  const handleLoadPreview = async () => {
    setLoadingPreview(true);
    setLoadError(false);
    setErrorMessage(null);
    
    try {
        const result = await onPreview(passwordInput);
        if (result && 'url' in result) {
          setPreviewUrl(result.url);
          
          let effectiveType = result.type;
          // If the blob type is generic or missing, try to infer from fileInfo
          if ((!effectiveType || effectiveType === 'application/octet-stream') && fileInfo) {
              if (fileInfo.type && fileInfo.type.match(/^(image|video|audio)/)) {
                 effectiveType = fileInfo.type;
              } else if (fileInfo.filename) {
                 const ext = fileInfo.filename.split('.').pop()?.toLowerCase();
                 if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '')) effectiveType = 'audio/mpeg';
                 else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) effectiveType = 'video/mp4';
                 else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) effectiveType = 'image/png';
              }
          }

          setPreviewType(effectiveType);
          // Play state will be handled by media events
        } else if (result && 'error' in result) {
            setLoadError(true);
            setErrorMessage(result.error);
        } else {
            setLoadError(true);
            setErrorMessage("Unknown error occurred");
        }
    } catch (e: any) {
        console.error("Preview load failed", e);
        setLoadError(true);
        setErrorMessage(e.message || "An unexpected error occurred");
    } finally {
        setLoadingPreview(false);
    }
  };
  
  // Media Control Handlers
  const togglePlay = () => {
    if (mediaRef.current) {
        if (isPlaying) {
            mediaRef.current.pause();
        } else {
            mediaRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
        setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
        setDuration(mediaRef.current.duration);
        setIsMetadataLoaded(true);
        setIsBuffering(false);
    }
  };

  const handleWaiting = () => setIsBuffering(true);
  const handleCanPlay = () => setIsBuffering(false);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (mediaRef.current) {
        mediaRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      if (mediaRef.current) {
          mediaRef.current.volume = vol;
          setVolume(vol);
          setIsMuted(vol === 0);
      }
  };

  const toggleMute = () => {
      if (mediaRef.current) {
          const newMuted = !isMuted;
          mediaRef.current.muted = newMuted;
          setIsMuted(newMuted);
      }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (videoContainerRef.current) {
        if (videoContainerRef.current.requestFullscreen) {
          videoContainerRef.current.requestFullscreen();
        } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
          (videoContainerRef.current as any).webkitRequestFullscreen();
        } else if ((videoContainerRef.current as any).msRequestFullscreen) {
          (videoContainerRef.current as any).msRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = async (text: string, setCopied: (val: boolean) => void) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts or when document is not focused
        const textArea = document.createElement("textarea");
        textArea.value = text;
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

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?v=${fileCode}`;
    copyToClipboard(link, setShareCopied);
  };

  const handleCopyId = () => {
    copyToClipboard(fileCode, setIdCopied);
  };

  const getFileIcon = (type: string = '', filename: string = '') => {
    // Check MIME type first
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return VideoIcon;
    if (type.startsWith('audio/')) return MusicIcon;
    if (type.startsWith('text/') || type.includes('json') || type.includes('xml')) return CodeIcon;
    
    // Fallback to extension
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return ImageIcon;
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return VideoIcon;
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '')) return MusicIcon;
    if (['js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'html', 'css', 'txt', 'md'].includes(ext || '')) return CodeIcon;

    return DocumentIcon;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const FileIcon = getFileIcon(fileInfo?.type || 'unknown', fileInfo?.filename || '');
  
  // Robust check for media availability
  const isMedia = React.useMemo(() => {
     if (!fileInfo) return false;
     if (fileInfo.type?.match(/^(image|video|audio)/)) return true;
     
     // Fallback extension check
     const ext = fileInfo.filename?.split('.').pop()?.toLowerCase();
     return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mp4', 'webm', 'mov', 'avi', 'mkv', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
  }, [fileInfo]);

  // Auto-load Logic
  useEffect(() => {
    if (fileCode && fileInfo && isMedia && autoLoadRef.current !== fileCode) {
        // Skip auto-load if password is required to allow user to enter it
        if (fileInfo.requires_password) return;

        autoLoadRef.current = fileCode;
        handleLoadPreview();
    }
  }, [fileCode, fileInfo, isMedia]);

  const isOrganic = forensicReport ? !forensicReport.is_ai : false;

  const handleMediaError = () => {
    setLoadError(true);
    setErrorMessage("Media playback failed. Network might be unstable.");
    setIsBuffering(false);
    setIsPlaying(false);
  };

  const handleRetryMedia = async () => {
    if (mediaRef.current && previewUrl) {
        setLoadError(false);
        setErrorMessage(null);
        setIsBuffering(true);
        
        try {
            // Force a reload of the current source
            mediaRef.current.load();
            
            // Attempt to play
            const playPromise = mediaRef.current.play();
            if (playPromise !== undefined) {
                await playPromise;
            }
        } catch (e: any) {
            // Ignore AbortError which happens when playback is interrupted by a new load request
            if (e.name !== 'AbortError') {
                console.error("Retry play failed", e);
                setLoadError(true);
                setErrorMessage("Playback failed. Please try downloading the file.");
            }
        }
    } else {
        // If media ref is missing but we have a URL, try reloading the whole preview
        handleLoadPreview();
    }
  };

  return (
    <div className="w-full h-full bg-transparent flex flex-col animate-in fade-in duration-300">
        {/* Delete Confirmation Modal Overlay */}
        {showDeleteConfirm && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-6 animate-in fade-in duration-300">
               <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 mx-auto">
                     <TrashIcon className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white text-center mb-2">Permanently Delete?</h3>
                  <div className="text-sm text-slate-400 text-center mb-6 leading-relaxed">
                     This action cannot be undone. The file will be wiped from both the database and secure cloud storage immediately.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <button 
                       onClick={() => setShowDeleteConfirm(false)}
                       className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                       aria-label="Cancel Delete"
                     >
                        Cancel
                     </button>
                     <button 
                       onClick={() => {
                          setShowDeleteConfirm(false);
                          onDelete();
                       }}
                       className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors shadow-lg shadow-rose-900/20"
                       aria-label="Confirm Delete"
                     >
                        Confirm Kill
                     </button>
                  </div>
               </div>
            </div>
        )}

        {/* QR Code Modal Overlay */}
        {showQRModal && (
            <div className="absolute inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-6 animate-in fade-in duration-300">
               <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200 relative flex flex-col items-center">
                  <button 
                      onClick={() => setShowQRModal(false)}
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                      <XMarkIcon className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-white text-center mb-6">Scan to Download</h3>
                  <div className="p-4 bg-white rounded-xl mb-6">
                      <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?v=${fileCode}`} size={200} level="H" fgColor="#0f172a" bgColor="#ffffff" />
                  </div>
                  <div className="text-[10px] text-slate-400 text-center font-mono break-all px-4">
                      {`${window.location.origin}${window.location.pathname}?v=${fileCode}`}
                  </div>
               </div>
            </div>
        )}



        {/* Media Preview */}
        <div 
            className="relative w-full min-h-[320px] md:min-h-0 md:aspect-video bg-black/60 backdrop-blur-xl flex items-center justify-center overflow-hidden group border border-white/10 rounded-[32px] mb-8 shadow-2xl"
            onContextMenu={(e) => e.preventDefault()}
        >
            
            {/* Background Gradient/Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none"></div>
            
            {/* Grid Pattern in Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {previewUrl ? (
                <div className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-500">
                    {previewType?.startsWith('image') && (
                        <div className="relative w-full h-full flex items-center justify-center group/image">
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain shadow-2xl" referrerPolicy="no-referrer" />
                            
                            {/* Handshake Button Overlay */}
                            {isSharedLink && (
                                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                                    <button 
                                        className="group relative flex items-center gap-3 px-6 py-3 bg-white text-slate-950 rounded-full font-bold shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] transition-all duration-300 overflow-hidden"
                                        aria-label="Secure Handshake"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <HandshakeIcon className="w-5 h-5 text-violet-600 group-hover:text-violet-700 transition-colors" />
                                        <span className="uppercase tracking-widest text-xs group-hover:text-violet-950 transition-colors">Secure Handshake</span>
                                    </button>
                                </div>
                            )}

                            {/* AI Detection Overlay (Top Left) */}
                            {forensicReport && (
                                <div className="absolute top-0 left-0 p-6 z-20 transition-opacity duration-300">
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border shadow-lg ${forensicReport.is_ai ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                        {forensicReport.is_ai ? <ShieldExclamationIcon className="w-4 h-4" /> : <ShieldIcon className="w-4 h-4" />}
                                        <span>{forensicReport.is_ai ? 'AI DETECTED' : 'HUMAN VERIFIED'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {previewType?.startsWith('video') && (
                        <div 
                            ref={videoContainerRef}
                            className="relative w-full h-full flex items-center justify-center bg-black group/video"
                        >
                            <video 
                                ref={mediaRef as any}
                                src={previewUrl} 
                                className="w-full h-full object-contain" 
                                autoPlay
                                onClick={togglePlay}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onWaiting={handleWaiting}
                                onCanPlay={handleCanPlay}
                                onEnded={() => setIsPlaying(false)}
                                onError={handleMediaError}
                                preload="auto"
                                playsInline
                            />

                            {/* Error Overlay */}
                            {loadError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/80">
                                    <div className="text-rose-400 font-bold mb-4">{errorMessage || "Playback Error"}</div>
                                    <button 
                                        onClick={handleRetryMedia}
                                        className="px-4 py-2 bg-white text-black rounded-lg hover:bg-violet-400 hover:text-white transition-colors font-bold text-sm flex items-center gap-2"
                                        aria-label="Retry Media Connection"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" />
                                        Retry Connection
                                    </button>
                                </div>
                            )}

                            {/* Loading/Buffering Overlay - Only show if playing or initial load */}
                            {((isBuffering && isPlaying && !loadError) || (!isMetadataLoaded && !loadError)) && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/60 transition-all duration-300">
                                    <div className="relative w-20 h-20">
                                        {/* Tech Rings */}
                                        <div className="absolute inset-0 border-2 border-violet-500/20 rounded-full"></div>
                                        <div className="absolute inset-0 border-2 border-transparent border-t-violet-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-3 border-2 border-fuchsia-500/20 rounded-full"></div>
                                        <div className="absolute inset-3 border-2 border-transparent border-b-fuchsia-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
                                        
                                        {/* Center Hex/Pulse */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Status Text */}
                                    <div className="mt-6 flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                        <span className="text-[10px] font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 uppercase mt-2">
                                            {isMetadataLoaded ? 'Buffering Stream' : 'Initializing Uplink'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Center Play Button Overlay */}
                            {isMetadataLoaded && (
                                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-200 z-20 ${!isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover/video:opacity-100 group-hover/video:scale-100'}`}>
                                    <button 
                                        onClick={togglePlay}
                                        className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all pointer-events-auto shadow-2xl"
                                        aria-label={isPlaying ? "Pause" : "Play"}
                                    >
                                        {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8 ml-1" />}
                                    </button>
                                </div>
                            )}

                            {/* AI Detection Overlay (Top Left) */}
                            {forensicReport && (
                                <div className={`absolute top-0 left-0 p-6 z-20 transition-opacity duration-300 ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover/video:opacity-100'}`}>
                                    <div className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-[10px] font-bold border shadow-lg ${forensicReport.is_ai ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                        {forensicReport.is_ai ? <ShieldExclamationIcon className="w-4 h-4" /> : <ShieldIcon className="w-4 h-4" />}
                                        <span className="leading-none mt-0.5">{forensicReport.is_ai ? 'AI DETECTED' : 'HUMAN VERIFIED'}</span>
                                    </div>
                                </div>
                            )}

                            {/* ID Overlay (Top Right) */}
                            <div className={`absolute top-0 right-0 p-6 z-20 transition-opacity duration-300 ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover/video:opacity-100'}`}>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyId();
                                    }}
                                    className="px-3 h-8 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white hover:border-violet-500/30 transition-all flex items-center gap-2 shadow-lg"
                                    aria-label="Copy File ID"
                                >
                                    <span className="opacity-50 leading-none mt-0.5">ID</span>
                                    <span className="font-bold leading-none mt-0.5">{fileCode}</span>
                                    {idCopied ? (
                                        <ShieldCheckIcon className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                    )}
                                </button>
                            </div>
                            
                            {/* Handshake Button Overlay */}
                            {isSharedLink && (
                                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                                    <button 
                                        className="group relative flex items-center gap-3 px-6 py-3 bg-white text-slate-950 rounded-full font-bold shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] transition-all duration-300 overflow-hidden"
                                        aria-label="Secure Handshake"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <HandshakeIcon className="w-5 h-5 text-violet-600 group-hover:text-violet-700 transition-colors" />
                                        <span className="uppercase tracking-widest text-xs group-hover:text-violet-950 transition-colors">Secure Handshake</span>
                                    </button>
                                </div>
                            )}

                            {/* Custom Controls Overlay for Video */}
                            {isMetadataLoaded && (
                                <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 z-30 ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover/video:opacity-100'}`}>
                                    <div className="flex flex-col gap-2">
                                         <div className="relative w-full h-1 bg-white/20 rounded-full cursor-pointer group/slider">
                                             <div className="absolute top-0 left-0 h-full bg-violet-500 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                             <input 
                                                 type="range" 
                                                 min="0" 
                                                 max={duration || 0} 
                                                 value={currentTime} 
                                                 onChange={handleSeek}
                                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                 aria-label="Seek Slider"
                                             />
                                         </div>
                                         
                                         <div className="flex items-center justify-between mt-1">
                                             <div className="flex items-center gap-4">
                                                <button 
                                                     onClick={togglePlay}
                                                     className="text-white hover:text-violet-400 transition-colors"
                                                     aria-label={isPlaying ? "Pause" : "Play"}
                                                 >
                                                     {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                                                 </button>
                                                 <span className="text-xs font-mono text-white/80">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                             </div>
                                             
                                             <div className="flex items-center gap-4">
                                                 <div className="flex items-center gap-2 group/vol">
                                                    <button onClick={toggleMute} className="text-white hover:text-violet-400" aria-label={isMuted ? "Unmute" : "Mute"}>
                                                        {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                                                    </button>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="1" 
                                                        step="0.05" 
                                                        value={volume} 
                                                        onChange={handleVolumeChange}
                                                        className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
                                                        aria-label="Volume Slider"
                                                    />
                                                 </div>
                                                 <button 
                                                     onClick={toggleFullScreen}
                                                     className="text-white hover:text-violet-400 transition-colors"
                                                     title="Full Screen"
                                                     aria-label="Toggle Fullscreen"
                                                 >
                                                     <ArrowsPointingOutIcon className="w-5 h-5" />
                                                 </button>
                                             </div>
                                         </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {previewType?.startsWith('audio') && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
                             {/* AI Detection Overlay (Top Left) */}
                             {forensicReport && (
                                 <div className="absolute top-0 left-0 p-6 z-20 transition-opacity duration-300">
                                     <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border shadow-lg ${forensicReport.is_ai ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                                         {forensicReport.is_ai ? <ShieldExclamationIcon className="w-4 h-4" /> : <ShieldIcon className="w-4 h-4" />}
                                         <span>{forensicReport.is_ai ? 'AI DETECTED' : 'HUMAN VERIFIED'}</span>
                                     </div>
                                 </div>
                             )}
                             
                             {isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                    <div className="w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse-slow"></div>
                                </div>
                             )}
                             
                             {/* Pulsing Visual */}
                             <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_40px_rgba(124,58,237,0.3)] mb-12 md:mb-16 transition-transform duration-700 border-4 border-white/10 ${isPlaying ? 'scale-110' : 'scale-100'}`}>
                                 <MusicIcon className="w-12 h-12 md:w-20 md:h-20 text-white drop-shadow-md" />
                                 {isPlaying && (
                                    <>
                                      <div className="absolute inset-0 rounded-full border border-white/30 animate-ping"></div>
                                      <div className="absolute inset-0 rounded-full border border-white/10 animate-[ping_2s_linear_infinite]"></div>
                                    </>
                                 )}
                             </div>
                             
                             <audio 
                                ref={mediaRef as any}
                                src={previewUrl} 
                                autoPlay
                                className="hidden"
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onWaiting={handleWaiting}
                                onCanPlay={handleCanPlay}
                                onEnded={() => setIsPlaying(false)}
                                preload="auto"
                            />

                            {/* Handshake Button Overlay */}
                            {isSharedLink && (
                                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                                    <button className="group relative flex items-center gap-3 px-6 py-3 bg-white text-slate-950 rounded-full font-bold shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] transition-all duration-300 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <HandshakeIcon className="w-5 h-5 text-violet-600 group-hover:text-violet-700 transition-colors" />
                                        <span className="uppercase tracking-widest text-xs group-hover:text-violet-950 transition-colors">Secure Handshake</span>
                                    </button>
                                </div>
                            )}

                            {/* Custom Controls Bar */}
                            <div className="absolute bottom-6 left-0 right-0 px-6 md:px-12 z-20 flex justify-center">
                                <div className="w-full max-w-lg bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
                                     <div className="flex flex-col gap-3">
                                         {/* Progress */}
                                         <div className="relative w-full h-1.5 bg-slate-700/50 rounded-full cursor-pointer group/slider">
                                             <div className="absolute top-0 left-0 h-full bg-violet-500 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                             {/* Thumb */}
                                             <div 
                                                className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/slider:opacity-100 transition-opacity"
                                                style={{ left: `${(currentTime / duration) * 100}%`, marginLeft: '-6px' }}
                                             ></div>
                                             
                                             <input 
                                                 type="range" 
                                                 min="0" 
                                                 max={duration || 0} 
                                                 value={currentTime} 
                                                 onChange={handleSeek}
                                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                 aria-label="Seek Slider"
                                             />
                                         </div>
                                         
                                         <div className="flex items-center justify-between">
                                             <span className="text-[10px] font-mono text-slate-400 w-10">{formatTime(currentTime)}</span>
                                             
                                             <div className="flex items-center gap-6">
                                                 <div className="flex items-center gap-2 group/vol">
                                                    <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors" aria-label={isMuted ? "Unmute" : "Mute"}>
                                                        {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-4 h-4" /> : <SpeakerWaveIcon className="w-4 h-4" />}
                                                    </button>
                                                    <div className="w-16 h-1 bg-slate-700 rounded-full relative overflow-hidden group-hover/vol:bg-slate-600 transition-colors">
                                                         <div className="absolute top-0 left-0 h-full bg-slate-400" style={{ width: `${volume * 100}%` }}></div>
                                                         <input 
                                                             type="range" 
                                                             min="0" 
                                                             max="1" 
                                                             step="0.05" 
                                                             value={volume} 
                                                             onChange={handleVolumeChange}
                                                             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                             aria-label="Volume Slider"
                                                         />
                                                    </div>
                                                 </div>
 
                                                 <button 
                                                     onClick={togglePlay}
                                                     className="w-10 h-10 flex items-center justify-center bg-white text-slate-900 rounded-full hover:bg-violet-400 hover:text-white transition-all shadow-lg hover:shadow-violet-500/20 active:scale-95"
                                                     aria-label={isPlaying ? "Pause" : "Play"}
                                                 >
                                                     {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                                                 </button>
                                             </div>

                                             <span className="text-[10px] font-mono text-slate-400 w-10 text-right">{formatTime(duration)}</span>
                                         </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {!previewType?.match(/^(image|video|audio)/) && (
                         <div className="flex flex-col items-center justify-center text-slate-500">
                            <DocumentIcon className="w-16 h-16 md:w-20 md:h-20 mb-4 opacity-50" />
                            <p className="text-sm font-mono">Preview not available</p>
                            <p className="text-xs text-slate-600 mt-2">Format: {previewType}</p>
                         </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 w-full max-w-md relative z-10">
                    
                    {loadingPreview || (!fileInfo && isBusy) ? (
                         <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
                            <div className="relative w-24 h-24">
                                {/* Outer Ring */}
                                <div className="absolute inset-0 rounded-full border border-slate-700/50"></div>
                                {/* Spinning Gradients */}
                                <div className="absolute inset-0 rounded-full border-t-[3px] border-violet-500 animate-[spin_1s_linear_infinite] shadow-[0_0_20px_rgba(139,92,246,0.4)]"></div>
                                <div className="absolute inset-2 rounded-full border-r-[3px] border-fuchsia-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                                <div className="absolute inset-4 rounded-full border-b-[2px] border-cyan-500 animate-[spin_2s_linear_infinite]"></div>
                                {/* Center Pulse */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                     <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                                     <div className="absolute w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 tracking-[0.2em] animate-pulse">DECRYPTING_STREAM</h4>
                                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                                    Buffering secure payload...
                                </p>
                            </div>
                         </div>
                    ) : (
                        <>
                             {/* Only show retry or not supported if NOT loading */}
                             <div className="w-16 h-16 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center shadow-2xl mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500">
                                <FileIcon className="w-6 h-6 md:w-10 md:h-10 text-slate-400 group-hover:text-violet-400 transition-colors" />
                             </div>
                             
                             {isMedia ? (
                                <div className="space-y-3 md:space-y-4 w-full max-w-[260px] md:max-w-xs mx-auto px-4 md:px-0">
                                    <div className={`text-xs md:text-sm font-medium ${loadError ? 'text-rose-400' : 'text-slate-400'}`}>
                                        {loadError ? (errorMessage || 'Preview Failed') : 'Ready to View'}
                                    </div>
                                    
                                    {fileInfo?.requires_password && (
                                        <div className="relative group/input w-full">
                                            <input
                                                type="password"
                                                value={passwordInput}
                                                onChange={(e) => setPasswordInput(e.target.value)}
                                                placeholder="Enter Decryption Key"
                                                className="w-full h-9 md:h-10 pl-9 md:pl-10 pr-4 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50 text-xs md:text-sm transition-all"
                                                onKeyDown={(e) => e.key === 'Enter' && handleLoadPreview()}
                                                aria-label="Decryption Key"
                                            />
                                            <div className="absolute left-3 top-2.5 md:top-2.5 text-slate-600 group-focus-within/input:text-violet-400 transition-colors">
                                                <LockIcon className="w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleLoadPreview}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 rounded-xl bg-white text-slate-950 hover:bg-violet-400 hover:text-white font-bold transition-all shadow-lg hover:shadow-violet-500/25 active:scale-95 group/btn text-xs md:text-sm"
                                        aria-label={fileInfo?.requires_password ? (loadError ? 'Retry Decryption' : 'Decrypt and View') : (loadError ? 'Retry Loading' : 'Load Preview')}
                                    >
                                         {fileInfo?.requires_password ? <LockIcon className="w-4 h-4 md:w-5 md:h-5" /> : <ArrowPathIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                         <span>
                                            {fileInfo?.requires_password 
                                                ? (loadError ? 'Retry Decryption' : 'Decrypt & View') 
                                                : (loadError ? 'Retry Loading' : 'Load Preview')}
                                         </span>
                                    </button>
                                </div>
                            ) : (
                                <div className="text-slate-500 text-sm font-medium">
                                    Preview not supported for this file type
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>

        {/* Info Area */}
        <div className="w-full flex-1 flex flex-col h-auto bg-transparent relative overflow-hidden">
            
            {/* Content Area */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
                
                {/* Header Info */}
                <div>
                    {!fileInfo && isBusy ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-7 w-3/4 bg-slate-800 rounded-lg"></div>
                            <div className="flex gap-3">
                                <div className="h-6 w-20 bg-slate-800 rounded"></div>
                                <div className="h-6 w-24 bg-slate-800 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl lg:text-3xl font-bold text-white leading-tight break-words mb-3 lg:mb-5">
                                {fileInfo?.filename || 'Unknown File'}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs lg:text-sm text-slate-400 font-mono">
                                <span className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded">
                                    {formatBytes(fileInfo?.size || 0)}
                                </span>
                                <span className={`px-2 py-1 rounded border ${fileInfo?.requires_password ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'}`}>
                                    {fileInfo?.requires_password ? 'ENCRYPTED' : 'OPEN ACCESS'}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions Bar - Modernized */}
                <div className="p-5 lg:p-6 bg-white/[0.02] backdrop-blur-md rounded-[24px] border border-white/10 space-y-4 lg:space-y-6 shadow-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={handleDownloadClick}
                            className="w-full group relative flex items-center justify-center gap-3 h-14 lg:h-16 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-2xl font-semibold text-sm lg:text-base transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] border-t border-white/10 hover:border-white/20 active:scale-[0.98]"
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                            <DownloadIcon className="w-5 h-5 lg:w-6 lg:h-6 text-slate-300 group-hover:text-white transition-colors relative z-10" /> 
                            <span className="relative z-10 tracking-wide">Download File</span>
                        </button>
                        
                        {onExportConfig && (
                            <button 
                                onClick={onExportConfig}
                                className="w-full group relative flex items-center justify-center gap-3 h-14 lg:h-16 bg-gradient-to-b from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white rounded-2xl font-semibold text-sm lg:text-base transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.3)] border-t border-white/10 hover:border-white/20 active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                                <DocumentIcon className="w-5 h-5 lg:w-6 lg:h-6 text-violet-200 group-hover:text-white transition-colors relative z-10" /> 
                                <span className="relative z-10 tracking-wide">Export Config</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-6">
                        <button 
                            onClick={handleCopyLink}
                            className="flex items-center justify-center gap-2 h-12 lg:h-14 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 text-xs lg:text-sm font-semibold group"
                        >
                            <ChainIcon className={`w-4 h-4 lg:w-5 lg:h-5 transition-colors ${shareCopied ? 'text-emerald-400' : 'group-hover:text-indigo-400'}`} />
                            <span>{shareCopied ? 'Copied' : 'Share Link'}</span>
                        </button>
                        <button 
                            onClick={() => setShowQRModal(true)}
                            className="w-12 lg:w-14 h-12 lg:h-14 flex items-center justify-center bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group"
                            aria-label="Show QR Code"
                        >
                            <QrCodeIcon className="w-4 h-4 lg:w-5 lg:h-5 group-hover:text-indigo-400 transition-colors" />
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 h-12 lg:h-14 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-2xl border border-rose-500/20 hover:border-rose-500/30 transition-all duration-300 text-xs lg:text-sm font-semibold group"
                        >
                            <TrashIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            <span>Delete File</span>
                        </button>
                    </div>
                </div>

                {/* Forensic Analysis Section */}
                {forensicReport && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <BugIcon className="w-4 h-4" />
                                <span>Forensic Analysis Report</span>
                            </h3>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                forensicReport.is_ai || forensicReport.has_metadata 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                                {forensicReport.is_ai || forensicReport.has_metadata ? 'Attention Required' : 'Verified Secure'}
                            </div>
                        </div>

                        <div className="p-1 rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent p-[1px]">
                            <div className="bg-slate-950/80 backdrop-blur-xl rounded-[23px] p-6 space-y-6">
                                
                                {/* Status Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* AI Detection Card */}
                                    <div className={`p-4 rounded-2xl border ${forensicReport.is_ai ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/50 border-white/5'} flex flex-col gap-3 transition-all hover:scale-[1.02]`}>
                                        <div className="flex items-center justify-between">
                                            <div className={`p-2 rounded-lg ${forensicReport.is_ai ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                                                <ActivityIcon className="w-5 h-5" />
                                            </div>
                                            {forensicReport.is_ai && (
                                                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Content Origin</div>
                                            <div className={`text-sm font-bold ${forensicReport.is_ai ? 'text-amber-400' : 'text-slate-200'}`}>
                                                {forensicReport.is_ai ? 'AI Generated' : 'Human Verified'}
                                            </div>
                                        </div>
                                        {forensicReport.is_ai && (
                                            <div className="w-full bg-amber-950/30 h-1 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 w-[92%]"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata Card */}
                                    <div className={`p-4 rounded-2xl border ${forensicReport.has_metadata ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/50 border-white/5'} flex flex-col gap-3 transition-all hover:scale-[1.02]`}>
                                        <div className="flex items-center justify-between">
                                            <div className={`p-2 rounded-lg ${forensicReport.has_metadata ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                                                <TerminalIcon className="w-5 h-5" />
                                            </div>
                                            {forensicReport.has_metadata && (
                                                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Metadata Scan</div>
                                            <div className={`text-sm font-bold ${forensicReport.has_metadata ? 'text-rose-400' : 'text-slate-200'}`}>
                                                {forensicReport.has_metadata ? 'Data Found' : 'Clean'}
                                            </div>
                                        </div>
                                        {forensicReport.has_metadata && (
                                            <div className="w-full bg-rose-950/30 h-1 rounded-full overflow-hidden">
                                                <div className="h-full bg-rose-500 w-[100%]"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Area */}
                                {forensicReport.has_metadata && (
                                    <div className="pt-2 border-t border-white/5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="text-xs text-slate-400 leading-relaxed">
                                                <span className="text-rose-400 font-bold">Warning:</span> Hidden metadata contains location or device info. Scrubbing is recommended.
                                            </div>
                                            <button
                                                onClick={onScrub}
                                                disabled={isBusy}
                                                className="flex-shrink-0 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-900/20 hover:shadow-rose-900/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isBusy ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <ShieldCheckIcon className="w-4 h-4" />
                                                )}
                                                <span>Scrub Data</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default FilePreview;
