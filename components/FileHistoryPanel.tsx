
import React, { useState, memo, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  BarsArrowUpIcon, 
  BarsArrowDownIcon, 
  FunnelIcon,
  PlayIcon,
  TrashIcon,
  ImageIcon, 
  VideoIcon, 
  MusicIcon, 
  CodeIcon, 
  DocumentIcon,
  ClockIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon
} from './Icons';
import { StoredFile } from '../types';
import Skeleton from './common/Skeleton';

interface FileHistoryPanelProps {
  files: StoredFile[];
  onSelect: (code: string) => void;
  onDelete: (code: string) => void;
  height?: string;
}

const FileHistoryPanel: React.FC<FileHistoryPanelProps> = memo(({ files, onSelect, onDelete, height = "h-[600px]" }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: { type?: string }) => {
    const type = file.type || '';
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return VideoIcon;
    if (type.startsWith('audio/')) return MusicIcon;
    if (type.startsWith('text/') || type.includes('json') || type.includes('javascript') || type.includes('typescript') || type.includes('xml') || type.includes('html')) return CodeIcon;
    return DocumentIcon;
  };

  const toggleSort = (field: 'date' | 'name' | 'size') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.code.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    let res = 0;
    if (sortBy === 'name') res = a.filename.localeCompare(b.filename);
    else if (sortBy === 'size') res = a.size - b.size;
    else res = a.date.getTime() - b.date.getTime(); // Default date
    return sortOrder === 'asc' ? res : -res;
  });

  return (
    <div className={`relative rounded-[40px] flex flex-col ${height} overflow-hidden border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl glass-animate`}>
       {/* Decorative gradient header */}
       <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none"></div>
       
       {/* Header Section */}
       <div className="p-6 md:p-8 pb-0 z-10">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                   <ClockIcon className="w-6 h-6 text-violet-400" />
                   Vault History 
                   <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 text-xs font-bold border border-violet-500/20">{files.length}</span>
                </h3>
                <p className="text-sm text-slate-400 mt-1.5 ml-9">Local history of uploaded and inspected files.</p>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-64 group">
                   <input 
                     type="text" 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Search filenames or codes..."
                     className="w-full bg-slate-950/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-slate-900/80 transition-all shadow-inner"
                   />
                   <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 group-focus-within:text-violet-400 transition-colors" />
                </div>
             </div>
         </div>

         {/* Sort Controls */}
         <div className="flex items-center gap-2 mt-6 pb-4 border-b border-white/5 overflow-x-auto no-scrollbar">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Sort by</span>
            {['date', 'name', 'size'].map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field as any)}
                className={`liquid-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border ${
                  sortBy === field 
                    ? 'bg-violet-500/10 text-violet-300 border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]' 
                    : 'bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'
                }`}
                style={{ '--liquid-color': 'rgba(255, 255, 255, 0.1)' } as React.CSSProperties}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sortBy === field && (
                  sortOrder === 'asc' 
                    ? <BarsArrowUpIcon className="w-3 h-3" /> 
                    : <BarsArrowDownIcon className="w-3 h-3" />
                )}
              </button>
            ))}
         </div>
       </div>

       {/* List Content */}
       <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar z-10">
           {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                   <div key={i} className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col gap-4">
                       <div className="flex items-start gap-4">
                           <Skeleton variant="rect" className="w-12 h-12 flex-shrink-0" />
                           <div className="flex-1 space-y-2">
                               <Skeleton variant="text" className="w-1/2 h-4" />
                               <div className="flex gap-2">
                                   <Skeleton variant="text" className="w-16 h-3" />
                                   <Skeleton variant="text" className="w-12 h-3" />
                               </div>
                           </div>
                       </div>
                       <div className="flex gap-2">
                           <Skeleton variant="rect" className="flex-1 h-10" />
                           <Skeleton variant="rect" className="w-10 h-10" />
                       </div>
                   </div>
               ))
           ) : filteredFiles.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                    <FunnelIcon className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-base font-medium text-slate-300">No files found</p>
                  <p className="text-sm opacity-60 mt-1 max-w-xs text-center">
                    {files.length === 0 ? 'Your vault history is empty. Upload or inspect files to see them here.' : 'Try adjusting your search terms to find what you are looking for.'}
                  </p>
               </div>
           ) : (
               filteredFiles.map((file, index) => {
                  const FileIcon = getFileIcon(file);
                  return (
                    <div 
                      key={file.code} 
                      className="group relative p-4 rounded-3xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-slate-800/40 hover:shadow-2xl hover:shadow-violet-900/20 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md overflow-hidden"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                       {/* Glass Shine Effect */}
                       <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                       <div className="absolute -inset-full top-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-[200%] h-full transform -skew-x-12 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
                       <div className="flex items-start gap-4 mb-4">
                          {/* File Icon */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 shadow-lg transition-transform duration-500 group-hover:scale-105 ${
                             file.type?.startsWith('image') ? 'bg-pink-500/10 text-pink-400' :
                             file.type?.startsWith('video') ? 'bg-blue-500/10 text-blue-400' :
                             file.type?.startsWith('audio') ? 'bg-violet-500/10 text-violet-400' :
                             'bg-slate-700/30 text-slate-400'
                          }`}>
                             <FileIcon className="w-6 h-6" />
                          </div>
                          
                          {/* File Details */}
                          <div className="min-w-0 flex-1">
                             <h4 className="text-sm font-bold text-slate-200 truncate pr-2 group-hover:text-white transition-colors">{file.filename}</h4>
                             
                             <div className="flex items-center flex-wrap gap-2 md:gap-3 mt-1.5">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-white/10 text-[10px] font-mono text-slate-400 group-hover:text-violet-300 group-hover:border-violet-500/20 transition-colors">
                                  <span className="opacity-50">#</span>
                                  {file.code}
                                </div>
                                <span className="text-[11px] text-slate-500 font-medium">{formatBytes(file.size)}</span>
                                
                                {file.forensicReport && (
                                   <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${
                                       file.forensicReport.is_ai 
                                       ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                       : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                   }`}>
                                       {file.forensicReport.is_ai ? <ShieldExclamationIcon className="w-3 h-3" /> : <ShieldCheckIcon className="w-3 h-3" />}
                                       {file.forensicReport.is_ai ? 'AI Generated' : 'Human Generated'}
                                   </div>
                                )}
                             </div>

                             <div className="mt-1.5 text-[11px] text-slate-600 font-medium">
                                {file.date.toLocaleDateString()}
                             </div>
                          </div>
                       </div>
                       
                       {/* Actions */}
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onSelect(file.code)}
                            className="liquid-btn flex-1 h-10 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all border border-white/5 hover:border-white/10 shadow-sm"
                            style={{ '--liquid-color': 'rgba(255, 255, 255, 0.1)' } as React.CSSProperties}
                          >
                             <PlayIcon className="w-3.5 h-3.5 fill-current" />
                             Open
                          </button>
                          
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(file.code);
                            }}
                            className="w-10 h-10 flex items-center justify-center bg-slate-800/50 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 rounded-xl border border-white/5 hover:border-rose-500/20 transition-all"
                            title="Remove from history"
                          >
                             <TrashIcon className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  );
               })
           )}
       </div>
    </div>
  );
});

export default FileHistoryPanel;
