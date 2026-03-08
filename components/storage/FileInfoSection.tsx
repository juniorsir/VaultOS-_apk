
import React from 'react';
import { EyeIcon, LockIcon, ShieldCheckIcon, BugIcon, ShieldExclamationIcon, ActivityIcon, TerminalIcon } from '../Icons';
import Spinner from '../common/Spinner';
import { FileInfo, ForensicReport } from '../../types';

interface FileInfoSectionProps {
  fileInfo: FileInfo | null;
  forensicReport: ForensicReport | null;
  isBusy: boolean;
  activeOperation: string | null;
  onScrub: () => void;
}

const FileInfoSection: React.FC<FileInfoSectionProps> = ({ 
  fileInfo, forensicReport, isBusy, activeOperation, onScrub 
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {fileInfo && (
          <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800 animate-in slide-in-from-top-2 space-y-4">
              {/* Basic Info */}
              <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <EyeIcon className="w-3 h-3" /> File Details
                      </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-mono text-slate-500">
                      <div className="col-span-2 flex flex-col">
                          <span className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Filename</span>
                          <span className="text-slate-200 font-medium truncate">{fileInfo.filename}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Size</span>
                          <span className="text-slate-300">{formatBytes(fileInfo.size)}</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Protection</span>
                          <span className={`${fileInfo.requires_password ? 'text-amber-400' : 'text-emerald-400'} flex items-center gap-1`}>
                            {fileInfo.requires_password ? <LockIcon className="w-3 h-3"/> : <ShieldCheckIcon className="w-3 h-3"/>}
                            {fileInfo.requires_password ? 'Password Locked' : 'None'}
                          </span>
                      </div>
                      <div className="col-span-2 flex flex-col border-t border-slate-800 pt-2">
                          <span className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Expires</span>
                          <span className="text-slate-400">{new Date(fileInfo.expiry_time).toLocaleString()}</span>
                      </div>
                  </div>
              </div>

              {/* AI Forensic Report - EXPANDED */}
              {forensicReport && (
                  <div className="border-t border-slate-800 pt-4 mt-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <BugIcon className="w-3 h-3 text-violet-400" /> AI Forensic Analysis
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border border-violet-400/50 shadow-md shadow-violet-500/20">
                          AI
                        </span>
                      </div>
                      
                      {/* Verdict Banner */}
                      <div className={`p-4 rounded-xl border flex items-center justify-between mb-4 transition-all ${
                          forensicReport.is_ai 
                          ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                          : 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                      }`}>
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${forensicReport.is_ai ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                  {forensicReport.is_ai ? <ShieldExclamationIcon className="w-5 h-5" /> : <ShieldCheckIcon className="w-5 h-5" />}
                              </div>
                              <div>
                                  <div className={`text-sm font-bold ${forensicReport.is_ai ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      {forensicReport.is_ai ? 'Artificial Content Detected' : 'Organic Content Verified'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      {forensicReport.analysis_timestamp ? new Date(forensicReport.analysis_timestamp).toLocaleString() : 'Analysis complete'}
                                  </div>
                              </div>
                          </div>
                          {forensicReport.confidence && (
                              <div className="text-right">
                                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Confidence</div>
                                  <div className={`text-xl font-black ${forensicReport.is_ai ? 'text-amber-500' : 'text-emerald-500'}`}>
                                      {forensicReport.confidence}%
                                  </div>
                              </div>
                          )}
                      </div>
                      
                      {/* Detailed Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-white/5">
                              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                                  {forensicReport.is_ai ? 'Suspected Source' : 'Detection Model'}
                              </div>
                              <div className="text-xs font-mono text-slate-300 truncate" title={forensicReport.provider}>
                                  {forensicReport.provider || 'Ensemble-v4'}
                              </div>
                          </div>
                          <div className="p-2.5 bg-slate-800/40 rounded-lg border border-white/5">
                              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Verdict</div>
                              <div className={`text-xs font-mono font-bold uppercase ${forensicReport.is_ai ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {forensicReport.verdict || (forensicReport.is_ai ? 'SYNTHETIC' : 'AUTHENTIC')}
                              </div>
                          </div>
                      </div>

                      {/* Confidence Visualization */}
                      {forensicReport.confidence && (
                          <div className="mb-4">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">
                                  <span>Probability Distribution</span>
                                  <span>{forensicReport.confidence}% Match</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${forensicReport.is_ai ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${forensicReport.confidence}%` }}
                                  ></div>
                                  <div className="h-full bg-slate-700/30 flex-1"></div>
                              </div>
                          </div>
                      )}

                      {/* Analysis Details */}
                      {forensicReport.details && forensicReport.details.length > 0 && (
                          <div className="bg-slate-950/30 rounded-xl p-3 border border-white/5 mb-4">
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <ActivityIcon className="w-3 h-3" /> Analysis Vectors
                              </div>
                              <div className="space-y-2">
                                  {forensicReport.details.map((detail, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                                          <div className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${forensicReport.is_ai ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                          <span className="leading-relaxed">{detail}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* Scrub Action */}
                      <button
                        onClick={onScrub}
                        disabled={isBusy}
                        className="w-full h-10 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-violet-900/20 hover:shadow-violet-900/40 active:scale-[0.98] group"
                      >
                          {isBusy && activeOperation === 'scrub' ? (
                              <>
                                <Spinner className="w-3.5 h-3.5" />
                                <span>Deep Cleaning...</span>
                              </>
                          ) : (
                              <>
                                <TerminalIcon className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                <span>Scrub Metadata & Artifacts</span>
                              </>
                          )}
                      </button>
                  </div>
              )}
          </div>
      )}

      {/* Loading State for Inspection */}
      {isBusy && activeOperation === 'inspect' && !fileInfo && (
          <div className="mt-4 p-6 bg-slate-900/30 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center gap-3 animate-pulse">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
              <span className="text-[11px] text-indigo-400 font-medium">Retrieving details...</span>
          </div>
      )}

      {!fileInfo && (!isBusy || activeOperation !== 'inspect') && (
          <div className="p-4 bg-slate-800/20 rounded-xl border border-white/5 mt-4 min-h-[80px] flex flex-col justify-center">
            <p className="text-xs text-slate-500 leading-relaxed text-center">
                Enter a File Code to see details, play media, or download.
            </p>
          </div>
      )}
    </>
  );
};

export default FileInfoSection;
