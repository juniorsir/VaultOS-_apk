import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  Play,
  Clock,
  Filter,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Code as CodeIcon,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from './common/Skeleton';

interface FileHistoryItem {
  code: string;
  filename: string;
  size: number;
  date: Date;
  type?: string;
  forensicReport?: {
    is_ai: boolean;
    confidence: number;
  };
}

interface FileHistoryPanelProps {
  files: FileHistoryItem[];
  onClose?: () => void;
  onSelect: (code: string) => void;
  onDelete: (code: string) => void;
  isLoading?: boolean;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (file: FileHistoryItem) => {
  const type = file.type || '';
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('video/')) return VideoIcon;
  if (type.startsWith('audio/')) return MusicIcon;
  if (type.startsWith('text/') || type.includes('json') || type.includes('javascript') || type.includes('typescript')) return CodeIcon;
  return FileText;
};

const FileHistoryPanel: React.FC<FileHistoryPanelProps> = React.memo(({ 
  files, 
  onClose, 
  onSelect, 
  onDelete,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');

  const filteredFiles = useMemo(() => {
    return files
      .filter(file => {
        const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            file.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || file.type?.startsWith(filter);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [files, searchQuery, filter]);

  return (
    <div className="flex flex-col h-full bg-white/[0.03] backdrop-blur-xl rounded-[40px] border border-white/10 p-6 md:p-10 relative overflow-hidden">
        
        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

        {/* Header */}
        <div className="py-8 md:py-10 border-b border-white/5 flex items-center justify-between z-10 relative">
            <div className="space-y-1">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">
                        Vault History
                    </h2>
                    <div className="h-px w-12 bg-gradient-to-r from-violet-500 to-transparent hidden md:block"></div>
                    <span className="text-[10px] font-mono bg-white/5 text-violet-300 px-3 py-1 rounded-full border border-white/10 tracking-[0.2em]">
                        {files.length} RECORDS
                    </span>
                </div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.15em] ml-1">Forensic Archive & Session Logs</p>
            </div>
            {onClose && (
              <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-3 rounded-full bg-white/5 text-slate-400 hover:text-white transition-all border border-white/10 shadow-xl"
              >
                  <X className="w-5 h-5" />
              </motion.button>
            )}
        </div>

        {/* Search & Filters */}
        <div className="py-6 space-y-6 z-10 border-b border-white/5">
          <div className="relative group">
            <div className="absolute inset-0 bg-violet-500/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-400 transition-colors z-10" />
            <input 
                type="text"
                placeholder="SEARCH ARCHIVE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 bg-slate-950/40 border border-white/10 rounded-2xl pl-12 pr-4 text-xs font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-violet-500/30 transition-all relative z-10 tracking-widest uppercase"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            {(['all', 'image', 'video', 'audio'] as const).map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                        filter === f 
                        ? 'bg-violet-600 text-white border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                        : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20 hover:text-slate-300'
                    }`}
                >
                    {f}
                </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-grow overflow-y-auto py-8 md:py-10 custom-scrollbar z-10">
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 flex flex-col gap-6">
                            <div className="flex items-start gap-4">
                                <Skeleton variant="rect" className="w-14 h-14 rounded-2xl" />
                                <div className="flex-1 space-y-3">
                                    <Skeleton variant="text" className="h-4 w-3/4" />
                                    <Skeleton variant="text" className="h-3 w-1/2" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Skeleton variant="rect" className="h-8 w-32 rounded-xl" />
                                <Skeleton variant="text" className="h-3 w-20" />
                            </div>
                            <div className="flex gap-3">
                                <Skeleton variant="rect" className="flex-1 h-12 rounded-2xl" />
                                <Skeleton variant="rect" className="w-12 h-12 rounded-2xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredFiles.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col items-center justify-center text-slate-500"
                >
                   <div className="w-24 h-24 rounded-full bg-white/[0.02] flex items-center justify-center mb-6 border border-white/5 shadow-2xl relative">
                     <div className="absolute inset-0 bg-violet-500/10 blur-2xl rounded-full"></div>
                     <Filter className="w-10 h-10 text-slate-600 relative z-10" />
                   </div>
                   <h3 className="text-xl font-black text-white tracking-tight uppercase italic">No Records Found</h3>
                   <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.2em] mt-3 max-w-xs text-center leading-relaxed">
                     {files.length === 0 
                        ? 'Archive is currently empty. Initiate a forensic scan to begin logging.' 
                        : 'Search parameters yielded zero results. Adjust filters and retry.'}
                   </p>
                </motion.div>
            ) : (
                <motion.div 
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredFiles.map((file, index) => {
                           const FileIcon = getFileIcon(file);
                           return (
                             <motion.div 
                               layout
                               initial={{ opacity: 0, scale: 0.9, y: 20 }}
                               animate={{ opacity: 1, scale: 1, y: 0 }}
                               exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                               transition={{ delay: index * 0.05, type: "spring", stiffness: 100, damping: 15 }}
                               key={file.code} 
                               className="group relative p-6 rounded-[32px] bg-white/[0.03] backdrop-blur-md border border-white/10 hover:border-violet-500/30 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col justify-between overflow-hidden"
                             >
                                {/* Hover Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-start gap-5 mb-6">
                                       {/* File Icon */}
                                       <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                                          file.type?.startsWith('image') ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                                          file.type?.startsWith('video') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                          file.type?.startsWith('audio') ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                          'bg-slate-800/50 text-slate-400 border-white/10'
                                       }`}>
                                          <FileIcon className="w-7 h-7" />
                                       </div>
                                       
                                       {/* File Details */}
                                       <div className="min-w-0 flex-1 pt-1">
                                          <h4 className="text-[13px] font-black text-white truncate pr-2 tracking-tight group-hover:text-violet-300 transition-colors uppercase italic">
                                            {file.filename}
                                          </h4>
                                          
                                          <div className="flex items-center flex-wrap gap-3 mt-2">
                                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-slate-400 group-hover:text-violet-300 group-hover:border-violet-500/30 transition-all">
                                               <span className="opacity-30">ID:</span>
                                               {file.code}
                                             </div>
                                             <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">{formatBytes(file.size)}</span>
                                          </div>
                                       </div>
                                    </div>

                                    {file.forensicReport && (
                                       <div className="mb-6">
                                           <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-[0.15em] shadow-lg ${
                                               file.forensicReport.is_ai 
                                               ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-900/10' 
                                               : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10'
                                           }`}>
                                               {file.forensicReport.is_ai ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                               <span>
                                                   {file.forensicReport.is_ai 
                                                       ? (file.forensicReport.provider && file.forensicReport.provider !== 'Ensemble-v4' 
                                                           ? `AI GENERATED: ${file.forensicReport.provider.toUpperCase()}` 
                                                           : 'AI GENERATED')
                                                       : 'HUMAN VERIFIED'}
                                               </span>
                                           </div>
                                       </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col gap-6 relative z-10">
                                    <div className="text-[10px] text-slate-600 font-black tracking-[0.1em] flex items-center gap-2 uppercase">
                                       <Clock className="w-3 h-3 text-slate-700" />
                                       <span>{file.date.toLocaleDateString()}</span>
                                       <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                                       <span>{file.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                       <motion.button 
                                         whileHover={{ scale: 1.02 }}
                                         whileTap={{ scale: 0.98 }}
                                         onClick={() => onSelect(file.code)}
                                         className="flex-1 h-12 flex items-center justify-center gap-3 bg-white/5 hover:bg-violet-600 text-slate-300 hover:text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 hover:border-violet-400 shadow-xl group/btn"
                                       >
                                          <Play className="w-3.5 h-3.5 fill-current group-hover/btn:text-white transition-colors" />
                                          <span>Open Record</span>
                                          <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                                       </motion.button>
                                       
                                       <motion.button 
                                         whileHover={{ scale: 1.05, backgroundColor: 'rgba(244, 63, 94, 0.1)' }}
                                         whileTap={{ scale: 0.95 }}
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             onDelete(file.code);
                                         }}
                                         className="w-12 h-12 flex items-center justify-center bg-white/5 text-slate-500 hover:text-rose-400 rounded-2xl border border-white/10 hover:border-rose-500/30 transition-all shadow-xl"
                                         title="Purge Record"
                                       >
                                          <Trash2 className="w-4.5 h-4.5" />
                                       </motion.button>
                                    </div>
                                </div>
                             </motion.div>
                           );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    </div>
  );
});

export default FileHistoryPanel;
