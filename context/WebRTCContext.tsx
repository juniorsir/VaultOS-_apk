import React, { createContext, useContext, ReactNode } from 'react';
import { useWebRTCManager, TransferItem } from '../hooks/useWebRTCManager';

// Define the shape of the context
type WebRTCContextType = ReturnType<typeof useWebRTCManager>;

const WebRTCContext = createContext<WebRTCContextType | null>(null);

export const WebRTCProvider = ({ children }: { children: ReactNode }) => {
  const webRTC = useWebRTCManager();

  return (
    <WebRTCContext.Provider value={webRTC}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export type { TransferItem };
