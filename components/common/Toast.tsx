
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div 
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border ${border} bg-slate-900/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-auto min-w-[300px] overflow-hidden group`}
    >
      {/* Subtle background tint based on type */}
      <div className={`absolute inset-0 ${bg} opacity-20 pointer-events-none`} />
      
      <div className={`relative p-2 rounded-xl bg-slate-950/50 ${color} ring-1 ring-white/5`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="relative flex-1 text-sm font-medium text-slate-200">
        {message}
      </div>
      
      <button 
        onClick={() => onClose(id)}
        className="relative p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default Toast;
