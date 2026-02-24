import React from 'react';
import { StoredFile } from '../../types';
import { 
  XMarkIcon, ShieldCheckIcon, ShieldExclamationIcon, DocumentIcon,
  CodeIcon, EyeIcon, ClockIcon, ServerIcon
} from '../Icons';
import Skeleton from '../common/Skeleton';

interface FilePreviewProps {
  file: StoredFile | null;
  onClose: () => void;
  isLoading: boolean;
}

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value?: string | number | null, valueClass?: string }> = 
  ({ icon: Icon, label, value, valueClass = '' }) => (
    <div className="flex items-start gap-4 py-3 border-b border-white/5">
      <Icon className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-xs text-slate-400 font-medium">{label}</div>
        {value !== undefined && value !== null ? (
          <div className={`text-sm text-white font-mono mt-1 ${valueClass}`}>{value}</div>
        ) : (
          <Skeleton variant="text" className="w-3/4 h-5 mt-1" />
        )}
      </div>
    </div>
);

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose, isLoading }) => {
  const isSecure = file?.forensicReport?.isSecure;

  const renderContent = () => {
    if (isLoading || !file) {
      return (
        <div className="space-y-2">
          <DetailRow icon={CodeIcon} label="File Code" />
          <DetailRow icon={ClockIcon} label="Upload Date" />
          <DetailRow icon={ServerIcon} label="File Size" />
          <DetailRow icon={CodeIcon} label="MIME Type" />
          <DetailRow icon={ShieldCheckIcon} label="Security Status" />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <DetailRow icon={CodeIcon} label="File Code" value={file.code} valueClass="text-violet-300" />
        <DetailRow icon={ClockIcon} label="Upload Date" value={new Date(file.date).toLocaleString()} />
        <DetailRow icon={ServerIcon} label="File Size" value={`${(file.size / 1024).toFixed(2)} KB`} />
        <DetailRow icon={CodeIcon} label="MIME Type" value={file.type} />
        <DetailRow 
          icon={isSecure ? ShieldCheckIcon : ShieldExclamationIcon} 
          label="Security Status" 
          value={isSecure ? 'Secure' : 'Potentially Unsafe'}
          valueClass={isSecure ? 'text-emerald-400' : 'text-amber-400'}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg m-4">
        <div className="w-full p-1 rounded-[30px] bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-white/10 shadow-2xl">
          <div className="bg-slate-900/90 rounded-[26px] p-6 md:p-8 relative">
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-slate-400" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-xl shadow-lg ${isLoading ? 'bg-slate-700' : isSecure ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {isLoading ? (
                  <Skeleton variant="rect" className="w-6 h-6" />
                ) : (
                  <DocumentIcon className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">File Information</h2>
                <p className="text-xs text-slate-500">Forensic analysis report</p>
              </div>
            </div>

            {renderContent()}

          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
