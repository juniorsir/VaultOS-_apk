
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

  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [focusedExpiry, setFocusedExpiry] = useState(uploadExpiry);
  const expiryPickerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected option when picker opens
  useEffect(() => {
    if (showExpiryPicker && scrollContainerRef.current) {
        setFocusedExpiry(uploadExpiry);
        const index = EXPIRY_OPTIONS.findIndex(o => o.value === uploadExpiry);
        if (index !== -1) {
            // 48px is the item height
            scrollContainerRef.current.scrollTop = index * 48;
        }
    }
  }, [showExpiryPicker, uploadExpiry]);

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

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expiryPickerRef.current && !expiryPickerRef.current.contains(event.target as Node)) {
        setShowExpiryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="space-y-8">
      <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        Upload New File
      </label>
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      
      <div 
        onClick={!isConnected || isProcessing ? undefined : () => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full h-64 rounded-[30px] border-2 border-dashed flex flex-col items-center justify-center transition-all duration-200 group overflow-hidden ${
          isConnected && !isProcessing 
          ? 'cursor-pointer hover:border-violet-500/50 bg-white/[0.02]' 
          : 'opacity-100 cursor-not-allowed bg-white/[0.01]' 
        } ${
          isDragging 
            ? 'border-violet-500 bg-violet-500/10 scale-[1.02] shadow-[0_0_30px_rgba(139,92,246,0.15)]' 
            : 'border-slate-700/50'
        }`}
      >
        {/* Close Button */}
        {selectedFile && processingStage === 'idle' && (
            <button 
              onClick={handleRemoveFile}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/30 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 transition-all z-30 shadow-lg"
            >
               <XMarkIcon className="w-5 h-5" />
            </button>
        )}

        {/* Default State */}
        {processingStage === 'idle' && (
          <div className="pointer-events-none flex flex-col items-center">
            <div className={`relative z-10 p-5 rounded-full mb-4 transition-all duration-300 ${
              selectedFile || isDragging 
              ? 'bg-violet-600 text-white scale-110 shadow-lg shadow-violet-500/30' 
              : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-violet-300'
            }`}>
              <FileTypeIcon className="w-8 h-8" />
            </div>
            
            {selectedFile ? (
              <div className="relative z-10 text-center px-4 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-sm font-bold text-white truncate max-w-[220px] block mx-auto tracking-wide">{selectedFile.name}</span>
                <span className="text-[11px] text-slate-400 mt-2 block">
                  {selectedFile.type.split('/')[1]?.toUpperCase() || 'FILE'} &bull; {formatBytes(selectedFile.size)}
                </span>
              </div>
            ) : (
              <div className="relative z-10 text-center px-4">
                <span className={`text-sm font-medium block transition-colors ${isDragging ? 'text-violet-300' : 'text-slate-300'}`}>
                  {isDragging ? 'Release to upload' : 'Click to browse or drag file'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
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

      <div className="grid grid-cols-2 gap-4">
         <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 ml-1">Password (Optional)</label>
            <div className="relative">
                <input 
                  type="password" 
                  value={uploadPassword}
                  onChange={(e) => setUploadPassword(e.target.value)}
                  disabled={!selectedFile || isProcessing}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="Enter password"
                />
                <LockIcon className="w-4 h-4 text-slate-600 absolute right-3 top-3" />
            </div>
         </div>
         <div className="space-y-1 relative" ref={expiryPickerRef}>
            <label className="text-xs font-medium text-slate-400 ml-1">Expires In</label>
            
            {isCustomExpiry ? (
                <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 relative">
                        <input 
                            type="number" 
                            min="1" 
                            max="999"
                            value={customVal}
                            onChange={(e) => {
                                setCustomVal(e.target.value);
                                setUploadExpiry(`${e.target.value}${customUnit}`);
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-4 pr-2 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors pointer-events-auto"
                        />
                    </div>
                    <div className="w-24 relative">
                         <select 
                            value={customUnit}
                            onChange={(e) => {
                                setCustomUnit(e.target.value);
                                setUploadExpiry(`${customVal}${e.target.value}`);
                            }}
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 appearance-none transition-colors pointer-events-auto"
                         >
                            <option value="m">Mins</option>
                            <option value="h">Hours</option>
                            <option value="d">Days</option>
                         </select>
                         <ChevronDownIcon className="w-3 h-3 text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                    <button 
                        onClick={() => { setIsCustomExpiry(false); setUploadExpiry('24h'); }}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50 transition-colors pointer-events-auto"
                        title="Reset to default"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <>
                    <button
                      onClick={() => !isProcessing && selectedFile && setShowExpiryPicker(!showExpiryPicker)}
                      disabled={!selectedFile || isProcessing}
                      className={`w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white flex items-center justify-between transition-colors ${!selectedFile || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-violet-500/50 hover:bg-slate-800/50'}`}
                    >
                      <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-slate-500" />
                          <span>{EXPIRY_OPTIONS.find(o => o.value === uploadExpiry)?.label || uploadExpiry}</span>
                      </div>
                      <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${showExpiryPicker ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Custom Dropdown Picker */}
                    {showExpiryPicker && (
                       <div className="absolute bottom-full mb-2 left-0 w-full h-48 bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10">
                           <div 
                               ref={scrollContainerRef}
                               onScroll={(e) => {
                                   const index = Math.round(e.currentTarget.scrollTop / 48);
                                   if (EXPIRY_OPTIONS[index]) {
                                       setFocusedExpiry(EXPIRY_OPTIONS[index].value);
                                   }
                               }}
                               className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar py-[72px] relative z-10 scroll-smooth"
                           >
                               {EXPIRY_OPTIONS.map(opt => (
                                   <div 
                                       key={opt.value}
                                       onClick={() => { 
                                           if (opt.value === 'custom') {
                                               setIsCustomExpiry(true);
                                           } else {
                                               setUploadExpiry(opt.value); 
                                           }
                                           setShowExpiryPicker(false); 
                                       }}
                                       className={`h-12 flex items-center justify-center snap-center cursor-pointer transition-all duration-300 ${
                                           focusedExpiry === opt.value 
                                           ? 'text-violet-400 font-bold text-base tracking-wide scale-100 opacity-100 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' 
                                           : 'text-slate-500 hover:text-slate-300 text-sm scale-95 opacity-40 hover:opacity-70'
                                       }`}
                                   >
                                       {opt.label}
                                   </div>
                               ))}
                           </div>
                           
                           {/* Modern Gradient Overlays */}
                           <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-900 via-transparent to-slate-900 z-20"></div>
                           
                           {/* Center Highlight Bar */}
                           <div className="absolute top-1/2 left-4 right-4 h-12 -mt-6 border-y border-white/10 bg-white/5 pointer-events-none z-0 rounded-lg"></div>
                       </div>
                    )}
                </>
            )}
         </div>
      </div>
      
      <button
        onClick={handleUpload}
        disabled={!isConnected || !selectedFile || isProcessing}
        className="w-full h-12 flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98] group"
      >
        {isProcessing && processingStage !== 'idle' ? (
          <ModernSpinner size="sm" color="#0f172a" />
        ) : (
          <UploadIcon className="w-5 h-5" />
        )}
        <span className="text-sm">
          {isProcessing && processingStage !== 'idle' 
            ? (processingStage === 'uploading' ? `Uploading ${uploadProgress}%` : 'Processing...')
            : 'Upload File'}
        </span>
      </button>
    </div>
  );
};

export default UploadSection;
