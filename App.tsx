
import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import Toast, { ToastType } from './components/common/Toast';
import { useSecureClient } from './hooks/useSecureClient';
import { useTempMail } from './hooks/useTempMail';
import { LayoutIcon, VaultIcon, TerminalIcon, ClockIcon, EnvelopeIcon, WifiIcon } from './components/Icons';
import { StoredFile } from './types';
import Spinner from './components/common/Spinner';
import ModernSpinner from './components/common/ModernSpinner';

// Lazy load panels for better initial performance
const AuthPanel = lazy(() => import('./components/AuthPanel'));
const StoragePanel = lazy(() => import('./components/StoragePanel'));
const LogsPanel = lazy(() => import('./components/LogsPanel'));
const DashboardPanel = lazy(() => import('./components/DashboardPanel'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const FileHistoryPanel = lazy(() => import('./components/FileHistoryPanel'));
const TempMailPanel = lazy(() => import('./components/TempMailPanel'));
const AirDropPanel = lazy(() => import('./components/AirDropPanel'));

type TabType = 'files' | 'history' | 'status' | 'activity' | 'mail' | 'airlink';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

const NAV_ITEMS = [
  { id: 'files', label: 'My Files', icon: VaultIcon },
  { id: 'mail', label: 'Secure Mail', icon: EnvelopeIcon },
  { id: 'airlink', label: 'AirLink', icon: WifiIcon },
  { id: 'history', label: 'Vault History', icon: ClockIcon },
  { id: 'status', label: 'System Status', icon: LayoutIcon },
  { id: 'activity', label: 'Activity Log', icon: TerminalIcon },
];

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 animate-in fade-in duration-700">
    <div className="relative">
      <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full animate-pulse"></div>
      <ModernSpinner size="xl" className="relative z-10" />
    </div>
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm font-black text-white uppercase tracking-[0.3em] animate-pulse">
        Initializing_Vault
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" 
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [preserveSession, setPreserveSession] = useState(() => {
    const stored = localStorage.getItem('vault_preserve_session');
    return stored === null ? true : stored === 'true';
  });

  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    localStorage.setItem('vault_preserve_session', String(preserveSession));
  }, [preserveSession]);

  const [showLanding, setShowLanding] = useState(false);
  
  // Check for deep links (QR Code Sessions)
  const [initialMailSession, setInitialMailSession] = useState<string | null>(null);
  const [initialMailEmail, setInitialMailEmail] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    if (params.get('mailSession')) {
        return 'mail';
    }

    if (preserveSession) {
        const saved = localStorage.getItem('vault_active_tab');
        if (saved && ['files', 'history', 'status', 'activity', 'mail', 'airlink'].includes(saved)) {
            return saved as TabType;
        }
    }
    return 'files';
  });

  const tempMail = useTempMail();
  const { messages } = tempMail;
  const [lastReadCount, setLastReadCount] = useState(0);

  // Update read count when viewing mail tab or if messages decrease (deletion/expiration)
  useEffect(() => {
      if (activeTab === 'mail' || messages.length < lastReadCount) {
          setLastReadCount(messages.length);
      }
  }, [activeTab, messages.length, lastReadCount]);

  const hasUnreadMail = messages.length > lastReadCount;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('mailSession');
    const emailParam = params.get('email');
    if (sessionParam) {
        setInitialMailSession(sessionParam);
        if (emailParam) setInitialMailEmail(emailParam);
        setActiveTab('mail');
        // Clean URL without refresh
        window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
      if (preserveSession) localStorage.setItem('vault_active_tab', activeTab);
  }, [activeTab, preserveSession]);

  const [hideAuthPanel, setHideAuthPanel] = useState(false);
  
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>(() => {
    try {
      const saved = localStorage.getItem('vault_history');
      if (saved) return JSON.parse(saved).map((item: any) => ({ ...item, date: new Date(item.date) }));
    } catch (e) { console.warn('Failed to parse history:', e); }
    return [];
  });

  const [activeFileSelection, setActiveFileSelection] = useState<{ code: string; timestamp: number } | null>(null);

  const navRef = useRef<HTMLElement>(null);
  const lastItemRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const [showRightHint, setShowRightHint] = useState(false);
  const [showLeftHint, setShowLeftHint] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.target === lastItemRef.current) {
                    // Hide right hint when last item is visible
                    setShowRightHint(!entry.isIntersecting);
                }
                if (entry.target === firstItemRef.current) {
                    // Hide left hint when first item is visible
                    setShowLeftHint(!entry.isIntersecting);
                }
            });
        },
        {
            root: navRef.current,
            threshold: 0.1 // Trigger when 10% of the item is visible
        }
    );

    if (lastItemRef.current) observer.observe(lastItemRef.current);
    if (firstItemRef.current) observer.observe(firstItemRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Scroll hint animation for mobile users to indicate horizontal scrolling
    const timer = setTimeout(() => {
        if (navRef.current && window.innerWidth < 768) {
            navRef.current.scrollBy({ left: 40, behavior: 'smooth' });
            setTimeout(() => {
                navRef.current?.scrollBy({ left: -40, behavior: 'smooth' });
            }, 600);
        }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('vault_history', JSON.stringify(storedFiles));
  }, [storedFiles]);

  const {
    logs, isConnected, connect, uploadFile, downloadFile, fetchFileBlob, 
    deleteFile, getFileInfo, analyzeFile, scrubMetadata, isConnecting, isProcessing,
  } = useSecureClient({ onNotify: addToast });

  // Global drag and drop listener to switch to "My Files" tab
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files') && activeTab !== 'files') {
        setActiveTab('files');
      }
    };

    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [activeTab]);

  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => setHideAuthPanel(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setHideAuthPanel(false);
    }
  }, [isConnected]);

  const handleAddToHistory = (file: StoredFile) => {
    setStoredFiles(prev => {
      const existingIndex = prev.findIndex(f => f.code === file.code);
      let newFile = { ...file };
      
      if (existingIndex !== -1) {
          const existing = prev[existingIndex];
          // Preserve existing type if new one is generic
          if ((!newFile.type || newFile.type === 'unknown') && existing.type && existing.type !== 'unknown') {
              newFile.type = existing.type;
          }
          // Preserve existing forensic report if new one doesn't have it
          if (!newFile.forensicReport && existing.forensicReport) {
              newFile.forensicReport = existing.forensicReport;
          }
      }
      
      const filtered = prev.filter(f => f.code !== file.code);
      return [newFile, ...filtered];
    });
  };

  const handleDeleteFromHistory = (code: string) => {
    setStoredFiles(prev => prev.filter(f => f.code !== code));
    deleteFile(code);
  };

  const handleSelectFromHistory = (code: string) => {
    setActiveFileSelection({ code, timestamp: Date.now() });
    setActiveTab('files');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCachedFile = (code: string) => storedFiles.find(f => f.code === code);

  if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;

  return (
    <div className="relative min-h-screen pb-12 animate-in fade-in duration-700 overflow-x-hidden">
      
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            id={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={removeToast} 
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 relative z-50">
        <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setShowLanding(true)}>
              <div className="p-3 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-[20px] border border-violet-500/20 shadow-lg shadow-violet-500/10 transition-transform group-hover:scale-105">
                <VaultIcon className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  <span className="text-white">Vault</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">OS</span>
                </h1>
                <div className="hidden md:flex items-center gap-2 mt-0.5 text-[12px] font-medium text-slate-400">
                  <span className={`inline-block w-2 h-2 rounded-full transition-all duration-500 ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] scale-110' : 'bg-slate-600 scale-100'}`}></span>
                  <span className={`transition-colors duration-500 ${isConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-auto group z-50">
            {/* Visual Container Background */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl pointer-events-none ring-1 ring-white/5"></div>
            
            {/* Scroll Container */}
            <nav 
                ref={navRef}
                className="relative flex items-center gap-1 md:gap-1.5 overflow-x-auto no-scrollbar p-1.5 w-full md:w-auto rounded-full"
            >
                {NAV_ITEMS.map((item, index) => (
                  <button
                    key={item.id}
                    ref={index === 0 ? firstItemRef : index === NAV_ITEMS.length - 1 ? lastItemRef : null}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={`liquid-btn flex-shrink-0 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-300 ease-out whitespace-nowrap relative overflow-hidden group/item ${
                      activeTab === item.id 
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] scale-100' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 active:scale-95'
                    }`}
                    style={{ '--liquid-color': activeTab === item.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(139, 92, 246, 0.1)' } as React.CSSProperties}
                  >
                    {/* Active State Glow/Highlight */}
                    {activeTab === item.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                    )}
                    
                    <item.icon className={`w-4 h-4 transition-colors duration-300 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover/item:text-violet-300'}`} />
                    <span className="relative z-10">{item.label}</span>
                    {item.id === 'mail' && hasUnreadMail && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] z-20"></span>
                    )}
                  </button>
                ))}
                {/* Spacer for better end-of-scroll visibility on mobile */}
                <div className="w-1 flex-shrink-0 md:hidden"></div>
            </nav>

            {/* Left Fade Overlay (Mobile Only) - Visual cue for scrolling left */}
            <div 
                className={`absolute left-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-r from-[#020617] from-30% via-[#020617]/80 to-transparent pointer-events-none md:hidden rounded-l-full flex items-center justify-start pl-4 transition-opacity duration-300 ${showLeftHint ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="flex items-center gap-1 animate-pulse flex-row-reverse">
                    <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest drop-shadow-md">More</span>
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/50 animate-bounce-horizontal rotate-180 shadow-lg shadow-violet-900/20">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-violet-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                         </svg>
                    </div>
                </div>
            </div>

            {/* Right Fade Overlay (Mobile Only) - Visual cue for more content */}
            <div 
                className={`absolute right-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-l from-[#020617] from-30% via-[#020617]/80 to-transparent pointer-events-none md:hidden rounded-r-full flex items-center justify-end pr-4 transition-opacity duration-300 ${showRightHint ? 'opacity-100' : 'opacity-0'}`}
            >
                <div className="flex items-center gap-1 animate-pulse">
                    <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest drop-shadow-md">More</span>
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/50 animate-bounce-horizontal shadow-lg shadow-violet-900/20">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-violet-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                         </svg>
                    </div>
                </div>
            </div>
          </div>
        </header>

        <main className="relative">
          <Suspense fallback={<LoadingFallback />}>
            {activeTab === 'status' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <AuthPanel isConnected={isConnected} onConnect={connect} isConnecting={isConnecting} />
                 <DashboardPanel isConnected={isConnected} logsCount={logs.length} preserveSession={preserveSession} onTogglePreserve={() => setPreserveSession(prev => !prev)} />
              </div>
            )}

            {activeTab === 'files' && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`grid transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${hideAuthPanel ? 'grid-rows-[0fr] opacity-0 -translate-y-4 mb-0' : 'grid-rows-[1fr] opacity-100 translate-y-0 mb-6'}`}>
                  <div className="overflow-hidden">
                     <AuthPanel isConnected={isConnected} onConnect={connect} isConnecting={isConnecting} />
                  </div>
                </div>

                <StoragePanel
                  isConnected={isConnected} isProcessing={isProcessing} onUpload={uploadFile} onDownload={downloadFile} onPlay={fetchFileBlob}
                  onDelete={(code) => handleDeleteFromHistory(code)} getFileInfo={getFileInfo} analyzeFile={analyzeFile} scrubMetadata={scrubMetadata}
                  onAddToHistory={handleAddToHistory} 
                  externalFileSelection={activeFileSelection} 
                  preserveSession={preserveSession}
                  getCachedFile={getCachedFile}
                />
              </div>
            )}

            {activeTab === 'mail' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <TempMailPanel initialSessionId={initialMailSession} initialEmail={initialMailEmail} {...tempMail} />
              </div>
            )}

            {activeTab === 'airlink' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AirDropPanel />
              </div>
            )}

            {activeTab === 'history' && (
               <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <FileHistoryPanel files={storedFiles} onSelect={handleSelectFromHistory} onDelete={handleDeleteFromHistory} />
               </div>
            )}

            {activeTab === 'activity' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <LogsPanel logs={logs} title="Full System Log" height="h-[500px] md:h-[750px]" />
              </div>
            )}
          </Suspense>
        </main>

        <footer className="mt-16 md:mt-24 pb-8 flex flex-col items-center justify-center text-center px-4 space-y-4 opacity-50 hover:opacity-100 transition-opacity">
          <div className="text-slate-500 text-[10px] md:text-xs font-mono">SECURE FILE STORAGE &bull; ENCRYPTED SESSION</div>
          <div className="w-12 h-px bg-white/10"></div>
          <div className="text-[10px] text-slate-600 font-mono tracking-wider uppercase">&copy; 2025 Vault-OS</div>
        </footer>
      </div>
    </div>
  );
};

export default App;
