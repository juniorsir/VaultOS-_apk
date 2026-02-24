import React from 'react';

interface ModernSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

const ModernSpinner: React.FC<ModernSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'currentColor'
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  return (
    <div className={`relative ${sizeMap[size]} ${className}`}>
      {/* Outer Ring */}
      <svg 
        className="animate-[spin_3s_linear_infinite] absolute inset-0 opacity-20" 
        viewBox="0 0 100 100"
      >
        <circle 
          cx="50" cy="50" r="45" 
          stroke={color} 
          strokeWidth="2" 
          fill="none" 
          strokeDasharray="10, 5"
        />
      </svg>
      
      {/* Middle Ring */}
      <svg 
        className="animate-[spin_2s_linear_infinite_reverse] absolute inset-0 opacity-40" 
        viewBox="0 0 100 100"
      >
        <circle 
          cx="50" cy="50" r="35" 
          stroke={color} 
          strokeWidth="4" 
          fill="none" 
          strokeDasharray="60, 40"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Inner Core */}
      <svg 
        className="animate-[spin_1s_cubic-bezier(0.4,0,0.2,1)_infinite] absolute inset-0" 
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary, #8b5cf6)" />
            <stop offset="100%" stopColor="var(--color-accent, #2dd4bf)" />
          </linearGradient>
        </defs>
        <circle 
          cx="50" cy="50" r="25" 
          stroke="url(#spinner-grad)" 
          strokeWidth="6" 
          fill="none" 
          strokeDasharray="80, 100"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Center Dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
      </div>
    </div>
  );
};

export default ModernSpinner;
