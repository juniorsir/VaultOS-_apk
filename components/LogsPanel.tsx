
import React, { useEffect, useRef, useState } from 'react';
import { LogEntry, LogType } from '../types';
import { FunnelIcon } from './Icons';

interface LogsPanelProps {
  logs: LogEntry[];
  title?: string;
  height?: string;
}

const getLogStyles = (type: LogType): string => {
  switch (type) {
    case 'success':
      return 'text-emerald-400';
    case 'error':
      return 'text-red-400';
    case 'warn':
      return 'text-amber-400';
    case 'info':
    default:
      return 'text-slate-300';
  }
};

const LogLine: React.FC<{ log: LogEntry }> = React.memo(({ log }) => {
  const styles = getLogStyles(log.type);
  const time = log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className="flex items-start gap-3 py-1.5 font-mono text-[12px] hover:bg-white/5 px-2 rounded-lg -mx-2 transition-colors border-b border-white/[0.02]">
      <span className="text-slate-600 shrink-0 select-none">[{time}]</span>
      <div className={`flex-1 break-all ${styles}`}>
        <span className="opacity-50 mr-2">{'>'}</span> {log.message}
      </div>
    </div>
  );
});

const LogsPanel: React.FC<LogsPanelProps> = ({ logs, title = "System Logs", height = "h-[600px]" }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogType | 'all'>('all');

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs, filter]);

  const filteredLogs = logs.filter(log => filter === 'all' || log.type === filter);

  return (
    <div className={`glass glass-animate rounded-[40px] flex flex-col ${height} overflow-hidden border border-slate-800/50 bg-[#0a0f1c]/40 shadow-2xl`}>
      <div className="bg-slate-900/50 p-5 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
           <div className="flex gap-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
           </div>
           <span className="text-sm font-bold text-slate-300 tracking-wide ml-2">{title}</span>
           <div className="px-2 py-0.5 rounded text-[9px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
             LIVE
           </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
            <FunnelIcon className="w-4 h-4 text-slate-600 mr-1" />
            {(['all', 'info', 'success', 'warn', 'error'] as const).map(type => (
                <button
                key={type}
                onClick={() => setFilter(type)}
                className={`liquid-btn px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all border ${
                    filter === type 
                    ? type === 'all' 
                        ? 'bg-slate-700 text-white border-slate-600'
                        : type === 'info'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : type === 'warn'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300'
                }`}
                style={{ '--liquid-color': 'rgba(255, 255, 255, 0.1)' } as React.CSSProperties}
                >
                {type}
                </button>
            ))}
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto p-5 scroll-smooth custom-scrollbar bg-black/20">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 select-none">
            <span className="font-mono text-xs">
                {logs.length === 0 ? 'Waiting for system events...' : 'No logs match current filter.'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredLogs.map((log, index) => (
              <LogLine key={`${log.timestamp.getTime()}-${index}`} log={log} />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPanel;
