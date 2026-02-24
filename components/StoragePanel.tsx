
import React, { useState, useEffect } from 'react';
import { FileInfo, ForensicReport, StoredFile } from '../types';

import UploadSection from './storage/UploadSection';
import { RetrievalSection } from './storage/RetrievalSection';
import FilePreviewModal from './storage/FilePreviewModal';
import MediaPlayer from './storage/MediaPlayer';

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
  getCachedFile
}) => {
  const [downloadPassword, setDownloadPassword] = useState('');
  
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
  
  // Preview Mode State (Controls whether to show list or inspector)
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Media Player State (Legacy - kept for inline play actions if needed)
  const [mediaState, setMediaState] = useState<{ url: string | null; type: 'video' | 'audio' | 'image' | string | null }>({ url: null, type: null });

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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    if (v && isConnected && !fileCode) {
      setFileCode(v);
      handleInspect(v);
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
      setShowPreviewModal(false);
  };

  const handleInspect = async (codeOverride?: string) => {
      const code = typeof codeOverride === 'string' ? codeOverride : fileCode;
      if (!code) return;

      setFileInfo(null);
      setForensicReport(null);
      setActiveOperation('inspect');
      setShowPreviewModal(true);

      // Check cache first
      const cached = getCachedFile ? getCachedFile(code) : undefined;
      let cachedReport = cached?.forensicReport || null;

      // Always fetch fresh file info to ensure file exists and metadata is up to date
      const info = await getFileInfo(code);
      setFileInfo(info);
      
      if (info) {
          // If we don't have a cached report, we must analyze
          if (!cachedReport) {
             cachedReport = await analyzeFile(code);
          } else {
             console.log("Using cached forensic report for", code);
          }

          setForensicReport(cachedReport);

          // Update history with fresh info + report
          onAddToHistory({
            code: code,
            filename: info.filename,
            size: info.size,
            date: cached ? cached.date : new Date(),
            type: info.type || 'unknown',
            forensicReport: cachedReport || undefined
          });
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
    <div className="relative p-6 md:p-8 rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-violet-900/20 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-950/90 backdrop-blur-xl transition-all duration-500 glass-animate">
      <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-50"></div>
      
      {/* Legacy Media Player Overlay (only used if triggered via other means) */}
      {mediaState.url && mediaState.type && (
        <MediaPlayer 
           url={mediaState.url}
           type={mediaState.type}
           onClose={closePlayer}
        />
      )}

      {/* Main Content Area - Swaps between Dashboard Grid and Preview Inspector */}
      <div className="relative z-10 pt-2">
        {showPreviewModal ? (
           <FilePreviewModal
              isOpen={true}
              onClose={() => setShowPreviewModal(false)}
              fileCode={fileCode}
              fileInfo={fileInfo}
              forensicReport={forensicReport}
              isBusy={isBusy}
              onDownload={handleDownloadAction}
              onDelete={handleDeleteAction}
              onScrub={handleScrubAction}
              onPreview={handlePreviewRequest}
            />
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default StoragePanel;
