
import React, { useEffect } from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon, XMarkIcon, TrashIcon } from '../Icons';

export type ToastType = 'success' | 'error' | 'info' | 'warn';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const config = {
    success: { icon: ShieldCheckIcon, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    error: { icon: ShieldExclamationIcon, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
    info: { icon: ShieldCheckIcon, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
    warn: { icon: TrashIcon, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  };

  const { icon: Icon, color, border, bg } = config[type];

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${border} ${bg} shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto min-w-[300px]`}>
      <div className={`p-2 rounded-xl bg-black/20 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-sm font-medium text-white/90">
        {message}
      </div>
      <button 
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
      <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 animate-[shimmer_5s_linear_forwards] rounded-full w-full origin-left"></div>
    </div>
  );
};

export default Toast;
