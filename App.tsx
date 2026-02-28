
import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Toast, { ToastType } from './components/common/Toast';
import { useSecureClient } from './hooks/useSecureClient';
import { useTempMail } from './hooks/useTempMail';
import { LayoutIcon, VaultIcon, TerminalIcon, ClockIcon, EnvelopeIcon, WifiIcon } from './components/Icons';
import { StoredFile, FileInfo, ForensicReport } from './types';
import Spinner from './components/common/Spinner';
import ModernSpinner from './components/common/ModernSpinner';

// Lazy load panels for better initial performance
const AuthPanel = lazy(() => import('./components/AuthPanel'));
const StoragePanel = lazy(() => import('./components/StoragePanel'));
const LogsPanel = lazy(() => import('./components/LogsPanel'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const FileHistoryPanel = lazy(() => import('./components/FileHistoryPanel'));
const TempMailPanel = lazy(() => import('./components/TempMailPanel'));
const AirDropPanel = lazy(() => import('./components/AirDropPanel'));


type TabType = 'files' | 'history' | 'activity' | 'mail' | 'airlink';

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

  const [showLanding, setShowLanding] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    // Skip landing page if deep linking to mail or file
    return !params.get('mailSession') && !params.get('v');
  });
  
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
        if (saved && ['files', 'history', 'activity', 'mail', 'airlink'].includes(saved)) {
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

  if (!isConnected) {
    return (
      <div className="relative min-h-screen bg-[#020617] flex items-center justify-center p-4 overflow-hidden">
        {/* Global Background Theme */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-slow animation-delay-4000"></div>
            <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-fuchsia-600/5 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
            <div className="absolute inset-0 backdrop-blur-[1px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center animate-in fade-in zoom-in duration-500">
             <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-slate-900/50 border border-white/10 mb-6 shadow-2xl relative group">
                    <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-[2rem] animate-pulse"></div>
                    <VaultIcon className="w-10 h-10 text-white relative z-10 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-3">
                    VAULT <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">LOCKED</span>
                </h1>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-[0.2em]">
                    Secure Handshake Required
                </p>
             </div>

             <div className="w-full">
                <Suspense fallback={<LoadingFallback />}>
                    <AuthPanel isConnected={isConnected} onConnect={connect} isConnecting={isConnecting} />
                </Suspense>
             </div>

             <div className="mt-12 flex items-center gap-4 opacity-50">
                <div className="h-px w-12 bg-white/10"></div>
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Encrypted Uplink</span>
                <div className="h-px w-12 bg-white/10"></div>
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 md:pb-12 animate-in fade-in duration-700 overflow-x-hidden bg-[#020617]">
      
      {/* Global Background Theme */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-slow animation-delay-4000"></div>
          <div className="absolute top-[20%] left-[15%] w-[300px] h-[300px] bg-fuchsia-600/5 rounded-full blur-[100px] animate-blob"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
          <div className="absolute inset-0 backdrop-blur-[1px]"></div>
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[300] flex flex-col gap-3 pointer-events-none items-end">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <Toast 
              key={toast.id} 
              id={toast.id} 
              message={toast.message} 
              type={toast.type} 
              onClose={removeToast} 
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-6xl lg:max-w-7xl xl:max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-10 relative z-50">
        <header className="mb-8 md:mb-12 lg:mb-16 flex flex-col items-center lg:flex-row lg:items-center justify-between gap-6 lg:gap-4">
          <div className="flex items-center justify-between w-full lg:w-1/4">
            <div 
              className="flex items-center gap-3 lg:gap-5 group cursor-pointer" 
              onClick={() => setShowLanding(true)}
              role="button"
              aria-label="Go to Landing Page"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowLanding(true)}
            >
              <div className="p-2 lg:p-3.5 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-[14px] lg:rounded-[18px] border border-violet-500/20 shadow-lg shadow-violet-500/10 transition-transform group-hover:scale-105">
                <VaultIcon className="w-4 h-4 lg:w-6 lg:h-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-base lg:text-xl font-bold tracking-tight">
                  <span className="text-white">Vault</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">OS</span>
                </h1>
                <div className="hidden md:flex items-center gap-1.5 lg:gap-2 mt-0.5 text-[10px] lg:text-[11px] font-medium text-slate-400">
                  <span className={`inline-block w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-all duration-500 ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] scale-110' : 'bg-slate-600 scale-100'}`}></span>
                  <span className={`transition-colors duration-500 ${isConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Status Indicator */}
            <div className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black tracking-widest text-slate-500 uppercase">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                <span>{isConnected ? 'SECURE' : 'OFFLINE'}</span>
            </div>
          </div>

          <div className="hidden md:block relative w-fit max-w-full group z-50 min-w-0">
            {/* Visual Container Background */}
            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl rounded-full border border-white/10 shadow-2xl pointer-events-none ring-1 ring-white/5"></div>
            
            {/* Scroll Container */}
            <nav 
                ref={navRef}
                className="relative flex items-center gap-1 md:gap-1 lg:gap-1 overflow-x-auto no-scrollbar p-1 lg:p-1.5 w-full md:w-auto rounded-full scroll-smooth"
            >
                {NAV_ITEMS.map((item, index) => (
                  <button
                    key={item.id}
                    ref={index === 0 ? firstItemRef : index === NAV_ITEMS.length - 1 ? lastItemRef : null}
                    onClick={() => setActiveTab(item.id as TabType)}
                    aria-label={`Switch to ${item.label}`}
                    className={`flex-shrink-0 md:flex-none flex items-center justify-center gap-1.5 lg:gap-3 px-4 py-2 lg:px-6 lg:py-3 rounded-full text-xs md:text-sm font-bold transition-all duration-300 ease-out whitespace-nowrap relative group/item ${
                      activeTab === item.id 
                        ? 'text-white' 
                        : 'text-slate-400 hover:text-slate-200 active:scale-95'
                    }`}
                  >
                    {activeTab === item.id && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] rounded-full z-0"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <item.icon className={`w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 transition-colors duration-300 relative z-10 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover/item:text-violet-300'}`} />
                    <span className="relative z-10">{item.label}</span>
                    {item.id === 'mail' && hasUnreadMail && (
                        <span className="absolute top-1.5 right-1.5 lg:top-2.5 lg:right-4 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)] z-20"></span>
                    )}
                  </button>
                ))}
                {/* Spacer for better end-of-scroll visibility on mobile */}
                <div className="w-1 flex-shrink-0 md:hidden"></div>
            </nav>

            {/* Left Fade Overlay - Visual cue for scrolling left */}
            <AnimatePresence>
                {showLeftHint && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-r from-[#020617] from-30% via-[#020617]/80 to-transparent pointer-events-none rounded-l-full flex items-center justify-start pl-4"
                    >
                        <div className="flex items-center gap-1 flex-row-reverse">
                            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest drop-shadow-md">More</span>
                            <motion.div 
                                animate={{ x: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/50 rotate-180 shadow-lg shadow-violet-900/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-violet-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Right Fade Overlay - Visual cue for more content */}
            <AnimatePresence>
                {showRightHint && (
                    <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="absolute right-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-l from-[#020617] from-30% via-[#020617]/80 to-transparent pointer-events-none rounded-r-full flex items-center justify-end pr-4"
                    >
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest drop-shadow-md">More</span>
                            <motion.div 
                                animate={{ x: [0, 4, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/50 shadow-lg shadow-violet-900/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 text-violet-300">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>

          {/* Desktop Status Section */}
          <div className="hidden lg:flex items-center justify-end w-1/4 gap-4">
             <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900/40 backdrop-blur-md rounded-full border border-white/5 text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span>Encrypted_Session</span>
             </div>
          </div>
        </header>

        <main className="relative">
          <Suspense fallback={<LoadingFallback />}>
            <div className={`w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ${activeTab === 'files' ? '' : 'hidden'}`}>
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
               <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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



        <footer className="mt-16 md:mt-24 pb-24 md:pb-8 flex flex-col items-center justify-center text-center px-4 space-y-4 opacity-50 hover:opacity-100 transition-opacity">
          <div className="text-slate-500 text-[10px] md:text-xs font-mono">SECURE FILE STORAGE &bull; ENCRYPTED SESSION</div>
          <div className="w-12 h-px bg-white/10"></div>
          <div className="text-[10px] text-slate-600 font-mono tracking-wider uppercase">&copy; 2025 Vault-OS</div>
        </footer>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-8 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent pointer-events-none">
          <nav className="flex items-center justify-between bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-[24px] px-2 py-2 shadow-2xl shadow-black/50 ring-1 ring-white/5 mx-auto max-w-md pointer-events-auto">
              {NAV_ITEMS.map((item) => (
                  <button
                      key={item.id}
                      onClick={() => {
                          setActiveTab(item.id as TabType);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      aria-label={`Switch to ${item.label}`}
                      className={`flex flex-col items-center justify-center gap-1.5 w-[4.5rem] h-14 rounded-[16px] transition-all duration-300 relative group ${
                          activeTab === item.id 
                              ? 'text-violet-300' 
                              : 'text-slate-500 hover:text-slate-300 active:scale-95'
                      }`}
                  >
                      {activeTab === item.id && (
                          <motion.div 
                              layoutId="activeTabMobile"
                              className="absolute inset-0 bg-violet-500/15 border border-violet-500/30 rounded-[16px] z-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                      )}
                      <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${activeTab === item.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'scale-100'}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider relative z-10 transition-all duration-300 ${activeTab === item.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                          {item.id === 'files' ? 'Files' : 
                           item.id === 'mail' ? 'Mail' : 
                           item.id === 'airlink' ? 'Link' : 
                           item.id === 'history' ? 'Archive' : 'Logs'}
                      </span>
                      {item.id === 'mail' && hasUnreadMail && (
                          <span className="absolute top-1.5 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20 border border-slate-900"></span>
                      )}
                  </button>
              ))}
          </nav>
      </div>
    </div>
  );
};

export default App;
