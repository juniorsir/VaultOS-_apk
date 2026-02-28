
import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadIcon, XMarkIcon, LockIcon, ShieldCheckIcon,
  ImageIcon, VideoIcon, MusicIcon, CodeIcon, DocumentIcon,
  ClockIcon, ChevronDownIcon
} from '../Icons';
import ModernSpinner from '../common/ModernSpinner';

interface UploadSectionProps {
  isConnected: boolean;
  isProcessing: boolean;
  onUpload: (file: File, password: string, expiry: string, onProgress: (progress: number) => void) => Promise<string | null>;
  onUploadComplete: (code: string, file: File) => void;
  preserveSession?: boolean;
}

type ProcessingStage = 'idle' | 'uploading' | 'scanning' | 'analyzing' | 'encrypting' | 'complete';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPIRY_OPTIONS = [
    { value: '10m', label: '10 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '12h', label: '12 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '3d', label: '3 Days' },
    { value: '7d', label: '7 Days' },
    { value: '14d', label: '14 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'custom', label: 'Custom Duration...' },
];

export const UploadSection: React.FC<UploadSectionProps> = ({ isConnected, isProcessing, onUpload, onUploadComplete, preserveSession = false }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPassword, setUploadPassword] = useState('');
  
  // Expiry State with Persistence
  const [uploadExpiry, setUploadExpiry] = useState(() => {
    if (preserveSession) {
        return localStorage.getItem('vault_upload_expiry') || '24h';
    }
    return '24h';
  });
  
  // Determine if we are in custom mode based on whether the current expiry is in the standard list
  const [isCustomExpiry, setIsCustomExpiry] = useState(() => {
      const current = preserveSession ? localStorage.getItem('vault_upload_expiry') || '24h' : '24h';
      return !EXPIRY_OPTIONS.some(o => o.value === current);
  });

  const [customVal, setCustomVal] = useState(() => {
      const current = preserveSession ? localStorage.getItem('vault_upload_expiry') || '24h' : '24h';
      const match = current.match(/^(\d+)([mhd])$/);
      return match ? match[1] : '1';
  });
  
  const [customUnit, setCustomUnit] = useState(() => {
      const current = preserveSession ? localStorage.getItem('vault_upload_expiry') || '24h' : '24h';
      const match = current.match(/^(\d+)([mhd])$/);
      return match ? match[2] : 'h';
  });

  // Update expiry when custom values change
  useEffect(() => {
      if (isCustomExpiry) {
          setUploadExpiry(`${customVal}${customUnit}`);
      }
  }, [customVal, customUnit, isCustomExpiry]);

  // Persist Expiry
  useEffect(() => {
    if (preserveSession) {
        localStorage.setItem('vault_upload_expiry', uploadExpiry);
    }
  }, [uploadExpiry, preserveSession]);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [isDragging, setIsDragging] = useState(false);
  
  // Use a ref to track drag depth to prevent flickering when dragging over children
  const dragCounter = useRef(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const type = file.type || '';
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return VideoIcon;
    if (type.startsWith('audio/')) return MusicIcon;
    if (type.startsWith('text/') || type.includes('json') || type.includes('javascript') || type.includes('typescript') || type.includes('xml') || type.includes('html')) return CodeIcon;
    return DocumentIcon;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadProgress(0);
      setProcessingStage('idle');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isConnected || isProcessing) return;

    dragCounter.current += 1;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isConnected || isProcessing) {
        e.dataTransfer.dropEffect = 'none';
        return;
    }
    // Explicitly set dropEffect to copy to indicate valid drop zone
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isConnected || isProcessing) return;

    dragCounter.current -= 1;
    
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset counter and state
    dragCounter.current = 0;
    setIsDragging(false);

    if (isConnected && !isProcessing && e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadProgress(0);
      setProcessingStage('idle');
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (selectedFile) {
        setProcessingStage('uploading');
        const fileToUpload = selectedFile;
        
        try {
            const code = await onUpload(fileToUpload, uploadPassword, uploadExpiry, (p) => {
                setUploadProgress(p);
                if (p >= 100) {
                    setProcessingStage('encrypting');
                }
            });
            
            if (code) {
                setProcessingStage('complete');
                await delay(1500);
                onUploadComplete(code, fileToUpload);
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setSelectedFile(null);
            setUploadPassword('');
            setUploadProgress(0);
            setProcessingStage('idle');
        }
    }
  };

  const FileTypeIcon = selectedFile ? getFileIcon(selectedFile) : UploadIcon;

  return (
    <div className="flex flex-col h-full gap-5">
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      
      <div 
        onClick={!isConnected || isProcessing ? undefined : () => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full flex-1 min-h-[200px] rounded-[30px] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 group overflow-hidden ${
          isConnected && !isProcessing 
          ? 'cursor-pointer hover:border-violet-400 hover:bg-violet-500/[0.05] hover:shadow-[0_0_50px_rgba(139,92,246,0.25)]' 
          : 'opacity-100 cursor-not-allowed bg-white/[0.01]' 
        } ${
          isDragging 
            ? 'border-violet-500 bg-violet-500/10 scale-[1.02] shadow-[0_0_30px_rgba(139,92,246,0.2)]' 
            : 'border-slate-700/50'
        }`}
      >
        {/* Close Button */}
        {selectedFile && processingStage === 'idle' && (
            <button 
              onClick={handleRemoveFile}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/30 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-all z-30 shadow-lg"
              aria-label="Remove selected file"
            >
               <XMarkIcon className="w-5 h-5" />
            </button>
        )}

        {/* Default State */}
        {processingStage === 'idle' && (
          <div className="pointer-events-none flex flex-col items-center transition-transform duration-300 group-hover:-translate-y-1">
            <div className={`relative z-10 p-5 rounded-full mb-4 transition-all duration-300 ${
              selectedFile || isDragging 
              ? 'bg-violet-600 text-white scale-110 shadow-lg shadow-violet-500/30' 
              : 'bg-slate-800 text-slate-400 group-hover:bg-violet-600 group-hover:text-white group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]'
            }`}>
              <FileTypeIcon className="w-8 h-8" />
            </div>
            
            {selectedFile ? (
              <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-base font-bold text-white truncate max-w-[220px] block mx-auto tracking-wide">{selectedFile.name}</span>
                <span className="text-xs text-slate-400 mt-2 block">
                  {selectedFile.type.split('/')[1]?.toUpperCase() || 'FILE'} &bull; {formatBytes(selectedFile.size)}
                </span>
              </div>
            ) : (
              <div className="relative z-10 text-center px-4">
                <span className={`text-base font-medium block transition-colors duration-300 ${isDragging ? 'text-violet-300' : 'text-slate-300 group-hover:text-white'}`}>
                  {isDragging ? 'Release to upload' : 'Click to browse or drag file'}
                </span>
                <span className="text-xs text-slate-500 block mt-1 group-hover:text-slate-400 transition-colors duration-300">
                  Max file size: 2GB
                </span>
              </div>
            )}
          </div>
        )}

        {/* PROCESSING OVERLAYS */}
        {processingStage !== 'idle' && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center p-6 transition-all duration-500">
            {processingStage === 'uploading' && (
              <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-full max-w-[200px] h-2 bg-slate-800 rounded-full overflow-hidden mb-4 border border-white/10 relative">
                    <div className="absolute inset-0 bg-slate-800 w-full h-full"></div>
                    <div 
                      className="h-full bg-violet-500 transition-all duration-300 relative z-10" 
                      style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                    ></div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-3xl font-bold text-white">{uploadProgress}%</span>
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
                    {uploadProgress >= 99 ? (
                       <>
                         <ModernSpinner size="sm" color="#8b5cf6" />
                         <span>Verifying...</span>
                       </>
                    ) : (
                       <span>Uploading...</span>
                    )}
                  </span>
                </div>
              </div>
            )}
             {processingStage === 'scanning' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
                  <ModernSpinner size="lg" color="#10b981" className="relative z-10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Scanning File</h3>
                <p className="text-xs text-slate-400 font-mono tracking-widest uppercase opacity-60">Checking for issues...</p>
              </div>
            )}
            {processingStage === 'analyzing' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
                  <ModernSpinner size="lg" color="#3b82f6" className="relative z-10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Analyzing Data</h3>
                <p className="text-xs text-slate-400 font-mono tracking-widest uppercase opacity-60">Processing metadata...</p>
              </div>
            )}
            {processingStage === 'encrypting' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full animate-pulse"></div>
                  <ModernSpinner size="lg" color="#8b5cf6" className="relative z-10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Encrypting</h3>
                <p className="text-xs text-slate-400 font-mono tracking-widest uppercase opacity-60">Securing your file...</p>
              </div>
            )}
            {processingStage === 'complete' && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="p-4 bg-emerald-500 rounded-full text-white mb-4">
                  <ShieldCheckIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Upload Complete</h3>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-50 shrink-0">
          {/* Password Input */}
          <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Encryption Password (Optional)</label>
              <div className="relative group/input">
                  <input
                    type="password"
                    value={uploadPassword}
                    onChange={(e) => setUploadPassword(e.target.value)}
                    placeholder="Leave blank for no password"
                    disabled={!isConnected || isProcessing}
                    className="w-full h-12 pl-10 pr-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50 focus:ring-1 focus:ring-violet-500/20 font-mono text-sm shadow-inner transition-all duration-300"
                  />
                  <div className="absolute left-3 top-3.5 text-slate-600 group-focus-within/input:text-violet-400 transition-colors">
                      <LockIcon className="w-5 h-5" />
                  </div>
              </div>
          </div>

          {/* Expiry Timeline Slider */}
          <div className="space-y-5 relative z-50">
              <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auto-Destruct Timer</label>
                  <span className="text-xs font-mono text-violet-300 font-bold bg-violet-500/20 px-3 py-1 rounded-lg border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                      {isCustomExpiry ? 'Custom Duration' : EXPIRY_OPTIONS.find(o => o.value === uploadExpiry)?.label}
                  </span>
              </div>
              
              <div className="relative h-14 flex items-center select-none px-0 md:px-2 group/slider">
                  {/* Track Line */}
                  <div className="absolute left-3 right-3 md:left-4 md:right-4 h-2.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5 group-hover/slider:border-violet-500/30 transition-colors duration-500">
                      {/* Fill */}
                      <div 
                          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500 ease-out shadow-[0_0_25px_rgba(139,92,246,0.6)] relative group-hover/slider:shadow-[0_0_35px_rgba(139,92,246,0.8)]"
                          style={{ width: `${(isCustomExpiry ? 100 : (Math.max(0, EXPIRY_OPTIONS.findIndex(o => o.value === uploadExpiry)) / (EXPIRY_OPTIONS.length - 1)) * 100)}%` }}
                      >
                          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                      </div>
                  </div>

                  {/* Steps / Ticks */}
                  <div className="absolute inset-0 flex justify-between items-center">
                      {EXPIRY_OPTIONS.map((option, index) => {
                          const currentIndex = isCustomExpiry ? EXPIRY_OPTIONS.length - 1 : Math.max(0, EXPIRY_OPTIONS.findIndex(o => o.value === uploadExpiry));
                          const isActive = index <= currentIndex;
                          const isSelected = index === currentIndex;
                          
                          return (
                              <button
                                  key={option.value}
                                  onClick={() => {
                                      if (option.value === 'custom') {
                                          setIsCustomExpiry(true);
                                      } else {
                                          setIsCustomExpiry(false);
                                          setUploadExpiry(option.value);
                                      }
                                  }}
                                  disabled={!isConnected || isProcessing}
                                  className="group/step relative w-6 md:w-8 h-14 flex items-center justify-center focus:outline-none cursor-pointer"
                                  aria-label={`Select ${option.label}`}
                              >
                                  {/* Tick Mark */}
                                  <div className={`rounded-full transition-all duration-300 relative z-10 ${
                                      isSelected 
                                        ? 'w-4 h-4 md:w-5 md:h-5 bg-white shadow-[0_0_20px_rgba(139,92,246,1)] ring-4 ring-violet-500/50 scale-125' 
                                        : isActive 
                                            ? 'w-2 h-2 md:w-2.5 md:h-2.5 bg-violet-200 shadow-[0_0_10px_rgba(139,92,246,0.5)] group-hover/step:scale-125' 
                                            : 'w-2 h-2 md:w-2.5 md:h-2.5 bg-slate-800 border border-white/10 group-hover/step:bg-slate-600 group-hover/step:border-white/30 group-hover/step:scale-125'
                                  }`} />
                                  
                                  {/* Hover Label (Tooltip) */}
                                  <div className={`absolute bottom-full mb-3 transition-all duration-300 pointer-events-none whitespace-nowrap z-20 ${isSelected ? 'opacity-0' : 'opacity-0 group-hover/step:opacity-100 translate-y-2 group-hover/step:translate-y-0'}`}>
                                      <div className="bg-slate-900/90 backdrop-blur text-[10px] font-bold text-slate-300 px-2.5 py-1.5 rounded-lg border border-white/10 shadow-xl uppercase tracking-wider">
                                          {option.label}
                                      </div>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
              
              {/* Custom Expiry Inputs (shown below slider if custom is chosen) */}
              {isCustomExpiry && (
                  <div className="flex gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input 
                        type="number" 
                        min="1"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                        className="w-20 h-10 bg-black/20 border border-white/5 rounded-xl px-3 text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50"
                      />
                      <div className="relative flex-1 group/unit">
                          <select 
                            value={customUnit}
                            onChange={(e) => setCustomUnit(e.target.value)}
                            className="w-full h-10 pl-3 pr-8 bg-black/20 border border-white/5 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/50 appearance-none cursor-pointer"
                          >
                              <option value="m" className="bg-slate-900">Minutes</option>
                              <option value="h" className="bg-slate-900">Hours</option>
                              <option value="d" className="bg-slate-900">Days</option>
                          </select>
                          <div className="absolute right-3 top-3 text-slate-500 pointer-events-none">
                              <ChevronDownIcon className="w-3 h-3" />
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={!isConnected || !selectedFile || isProcessing}
        className="w-full h-12 flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98] group shrink-0 relative z-40 overflow-hidden"
        aria-label="Start Upload"
      >
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent z-10 pointer-events-none" />
        {isProcessing && processingStage !== 'idle' ? (
          <ModernSpinner size="sm" color="#0f172a" />
        ) : (
          <UploadIcon className="w-5 h-5 relative z-20" />
        )}
        <span className="text-sm relative z-20">
          {isProcessing && processingStage !== 'idle' 
            ? (processingStage === 'uploading' ? `Uploading ${uploadProgress}%` : 'Processing...')
            : 'Upload File'}
        </span>
      </button>
    </div>
  );
};

export default UploadSection;
