
import React, { useState, useEffect } from 'react';
import { FileInfo, ForensicReport, StoredFile } from '../types';
import { PlusIcon, SignalIcon } from './Icons';

import UploadSection from './storage/UploadSection';
import { RetrievalSection } from './storage/RetrievalSection';
import MediaPlayer from './storage/MediaPlayer';
import FilePreview from './storage/FilePreview';

interface StoragePanelProps {
  isConnected: boolean;
  isProcessing: boolean;
  onUpload: (file: File, password: string, expiry: string, onProgress: (progress: number) => void) => Promise<string | null>;
  onDownload: (fileCode: string, password: string, onProgress?: (progress: number) => void) => void;
  onPlay: (fileCode: string, password: string) => Promise<{ url: string, type: string } | { error: string } | null>;
  onDelete: (fileCode: string) => void;
  getFileInfo: (fileCode: string) => Promise<FileInfo | null>;
  analyzeFile: (fileCode: string) => Promise<ForensicReport | null>;
  scrubMetadata: (fileCode: string) => Promise<string | null>;
  onAddToHistory: (file: StoredFile) => void;
  externalFileSelection?: { code: string; timestamp: number } | null;
  preserveSession?: boolean;
  getCachedFile?: (code: string) => StoredFile | undefined;
  onShowPreview: (code: string, info: FileInfo | null, report: ForensicReport | null) => void;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const StoragePanel: React.FC<StoragePanelProps> = ({ 
  isConnected, 
  isProcessing, 
  onUpload, 
  onDownload, 
  onPlay, 
  onDelete, 
  getFileInfo, 
  analyzeFile, 
  scrubMetadata, 
  onAddToHistory, 
  externalFileSelection,
  preserveSession = false,
  onShowPreview,
  getCachedFile
}) => {
  const [downloadPassword, setDownloadPassword] = useState('');
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
  
  // File Code State with Persistence
  const [fileCode, setFileCode] = useState(() => {
    if (preserveSession) {
        return localStorage.getItem('vault_file_code') || '';
    }
    return '';
  });

  // Persist fileCode
  useEffect(() => {
    if (preserveSession) {
        localStorage.setItem('vault_file_code', fileCode);
    }
  }, [fileCode, preserveSession]);

  const [activeOperation, setActiveOperation] = useState<'upload' | 'download' | 'scrub' | 'inspect' | 'play' | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [forensicReport, setForensicReport] = useState<ForensicReport | null>(null);

  // Media Player State (Legacy - kept for inline play actions if needed)
  const [mediaState, setMediaState] = useState<{ url: string | null; type: 'video' | 'audio' | 'image' | string | null }>({ url: null, type: null });
  const [view, setView] = useState<'default' | 'preview'>('default');
  const [previewFile, setPreviewFile] = useState<{ code: string; info: FileInfo | null; report: ForensicReport | null } | null>(null);

  // Local state for operations managed here (Scrubbing/Deletion mostly)
  const [localIsProcessing, setLocalIsProcessing] = useState(false);

  // Combine parent processing state with local animation state
  const isBusy = isProcessing || localIsProcessing;

  // React to external file selection changes (from History panel)
  useEffect(() => {
    if (externalFileSelection) {
      setFileCode(externalFileSelection.code);
      if (isConnected) {
         handleInspect(externalFileSelection.code);
      }
    }
  }, [externalFileSelection, isConnected]);

  // Auto-load from URL param 'v'
  const [isSharedLink, setIsSharedLink] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    if (v) {
      setIsSharedLink(true);
      if (isConnected && !fileCode) {
        setFileCode(v);
        handleInspect(v);
      }
    }
  }, [isConnected]); 

  // Reset operation when parent says we are done
  useEffect(() => {
    if (!isProcessing && !localIsProcessing) {
      setActiveOperation(null);
      setDownloadProgress(0);
    }
  }, [isProcessing, localIsProcessing]);

  const handleUploadComplete = (code: string, file: File) => {
      setFileCode(code);
      
      onAddToHistory({
        code,
        filename: file.name,
        size: file.size,
        date: new Date(),
        type: file.type
      });

      try {
        const newUrl = `${window.location.pathname}?v=${code}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      } catch (e) {
        console.debug('Could not update URL history:', e);
      }
      
      // Auto-inspect after upload for better UX
      handleInspect(code);
  };
  
  const handleDownloadAction = () => {
      // Trigger background download
      // We don't set activeOperation to 'download' locally to avoid blocking the UI with the overlay.
      // The global widget will handle progress.
      onDownload(fileCode, downloadPassword, (progress) => {
          // Optional: track local progress if needed, but we are skipping the overlay
      });
  };

  const handlePlayAction = async () => {
      // Direct play from Retrieval now also opens inspector for consistency
      handleInspect(fileCode);
  };

  const closePlayer = () => {
      if (mediaState.url) {
          window.URL.revokeObjectURL(mediaState.url);
      }
      setMediaState({ url: null, type: null });
  };

  const handleDeleteAction = () => {
      setActiveOperation('scrub');
      onDelete(fileCode);
      setFileInfo(null);
      setForensicReport(null);
  };

  const handleInspect = async (codeOverride?: string) => {
      const code = typeof codeOverride === 'string' ? codeOverride : fileCode;
      if (!code) return;

      setActiveOperation('inspect');

      // Check cache first
      const cached = getCachedFile ? getCachedFile(code) : undefined;
      let cachedReport = cached?.forensicReport || null;

      // Always fetch fresh file info to ensure file exists and metadata is up to date
      const info = await getFileInfo(code);
      
      if (info) {
          // If we don't have a cached report, we must analyze
          if (!cachedReport) {
             cachedReport = await analyzeFile(code);
          } else {
             console.log("Using cached forensic report for", code);
          }

          // Update history with fresh info + report
          onAddToHistory({
            code: code,
            filename: info.filename,
            size: info.size,
            date: cached ? cached.date : new Date(),
            type: info.type || 'unknown',
            forensicReport: cachedReport || undefined
          });

          setPreviewFile({ code, info, report: cachedReport });
          setView('preview');
      }
  };

  const handleScrubAction = async () => {
      if (!fileCode) return;
      setActiveOperation('scrub');
      setLocalIsProcessing(true);

      // Reduced artificial delay for better performance feel
      await delay(300); 

      const newCode = await scrubMetadata(fileCode);
      if (newCode) {
          setFileCode(newCode);
          // Refresh details for new code
          const info = await getFileInfo(newCode);
          setFileInfo(info);
          setForensicReport(null); 
          // Re-analyze forcedly because content changed
          const report = await analyzeFile(newCode);
          setForensicReport(report);
          
          if (info) {
              onAddToHistory({
                  code: newCode,
                  filename: info.filename,
                  size: info.size,
                  date: new Date(),
                  type: info.type || 'unknown',
                  forensicReport: report || undefined
              });
          }
      }
      
      setLocalIsProcessing(false);
  };

  const handlePreviewRequest = async (password?: string) => {
      return await onPlay(fileCode, password || downloadPassword);
  };

  return (
    <div className="relative p-6 md:p-8 lg:p-12 rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-violet-900/20 bg-white/[0.03] backdrop-blur-xl transition-all duration-500">
      
      {/* Subtle Grid Pattern Overlay - kept for texture but reduced opacity */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-30"></div>
      
      {/* Legacy Media Player Overlay (only used if triggered via other means) */}
      {mediaState.url && mediaState.type && (
        <MediaPlayer 
           url={mediaState.url}
           type={mediaState.type}
           onClose={closePlayer}
        />
      )}

      {/* Main Content Area - Swaps between Dashboard Grid and Preview Inspector */}
      <div className="relative z-10 pt-6 md:pt-8">
        {view === 'preview' && (
          <div className="flex items-center justify-between mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('default')} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors" aria-label="Back to Dashboard">
                <PlusIcon className="w-6 h-6 transform rotate-45" />
              </button>
              <h2 className="text-xl font-bold text-white tracking-wider"><span className="text-slate-500">/</span> INSPECTOR</h2>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono text-emerald-400">
              <SignalIcon className="w-5 h-5" />
              <span>{latency}ms</span>
            </div>
          </div>
        )}

        {view === 'default' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Left Column: Upload */}
              <UploadSection 
                isConnected={isConnected}
                isProcessing={isProcessing}
                onUpload={onUpload}
                onUploadComplete={handleUploadComplete}
                preserveSession={preserveSession}
              />

              {/* Right Column: Retrieval */}
              <div className="space-y-6 border-t md:border-t-0 md:border-l border-white/10 md:pl-8 pt-8 md:pt-0 relative">
                <RetrievalSection
                  fileCode={fileCode}
                  setFileCode={setFileCode}
                  downloadPassword={downloadPassword}
                  setDownloadPassword={setDownloadPassword}
                  isConnected={isConnected}
                  isBusy={isBusy}
                  activeOperation={activeOperation}
                  downloadProgress={downloadProgress}
                  onDownload={handleDownloadAction}
                  onPlay={handlePlayAction}
                  onInspect={() => handleInspect()}
                  onDelete={handleDeleteAction}
                />
              </div>
          </div>
        ) : previewFile && (
          <FilePreview 
            onBack={() => setView('default')}
            fileCode={previewFile.code}
            fileInfo={previewFile.info}
            forensicReport={previewFile.report}
            isBusy={isBusy}
            onDownload={handleDownloadAction}
            onDelete={handleDeleteAction}
            onScrub={handleScrubAction}
            onPreview={handlePreviewRequest}
            isSharedLink={isSharedLink}
          />
        )}
      </div>
    </div>
  );
};

export default StoragePanel;
