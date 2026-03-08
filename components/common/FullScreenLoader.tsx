import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModernSpinner from './ModernSpinner';

interface FullScreenLoaderProps {
  isVisible: boolean;
  message?: string;
}

const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ isVisible, message = 'Processing...' }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full animate-pulse"></div>
            <ModernSpinner size="xl" className="relative z-10" />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <div className="text-lg font-bold text-white tracking-widest uppercase animate-pulse">
              {message}
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i} 
                  className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" 
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullScreenLoader;
