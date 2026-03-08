
import React, { createContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';
import { SecureApiClient, API_BASE_URL } from '@/lib/secureClient';
import { LogEntry, LogType, ForensicReport, FileInfo } from '../types';

export interface VaultContextType {
  isAuthenticated: boolean;
  isConnecting: boolean;
  initializeSession: () => Promise<boolean>;
  terminateSession: () => void;
  client: SecureApiClient | null;
  logs: LogEntry[];
  addLog: (message: string, type?: LogType) => void;
  uploadFile: (file: File, password: string, expiry: string, onProgress: (progress: number) => void) => Promise<string | null>;
  runForensics: (fileCode: string) => Promise<ForensicReport | null>;
  getFileInfo: (fileCode: string) => Promise<FileInfo | null>;
  downloadFile: (fileCode: string, password?: string) => Promise<boolean>;
  deleteFile: (fileCode: string) => Promise<boolean>;
  scrubMetadata: (fileCode: string) => Promise<string | null>;
}

export const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Security: Secrets kept in class instance in useRef (RAM only, no React DevTools exposure of internal state)
  const clientRef = useRef<SecureApiClient | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((message: string, type: LogType = 'info') => {
    setLogs(prev => [...prev.slice(-200), { timestamp: new Date(), message, type }]);
  }, []);

  // Initialize client instance once
  if (!clientRef.current) {
    clientRef.current = new SecureApiClient((msg, type) => addLog(`[Net] ${msg}`, type));
  }

  const terminateSession = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    setIsAuthenticated(false);
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    addLog('Session expired or terminated.', 'warn');
  }, [addLog]);

  const initializeSession = useCallback(async () => {
    if (!clientRef.current) return false;
    
    setIsConnecting(true);
    const success = await clientRef.current.handshake();
    
    if (success) {
      setIsAuthenticated(true);
      // Set 1 hour expiry (3600 seconds)
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = setTimeout(() => {
        terminateSession();
      }, 3600 * 1000); 
    } else {
      setIsAuthenticated(false);
    }
    
    setIsConnecting(false);
    return success;
  }, [terminateSession]);

  const uploadFile = useCallback(async (
    file: File,
    password: string,
    expiry: string,
    onProgress: (progress: number) => void
  ): Promise<string | null> => {
    if (!clientRef.current || !isAuthenticated) return null;

    // Parse expiry string (e.g. "24h" or "7d") to backend format
    const expiryValue = parseInt(expiry.replace(/[^\d]/g, '')) || 24;
    const expiryUnit = expiry.includes('d') ? 'days' : 'hours';

    // Prepare Metadata: action 'push'
    const meta = {
      action: 'push',
      filename: file.name,
      size: file.size
    };
    const packedMeta = clientRef.current.packMeta(meta);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('expiry_value', expiryValue.toString());
    formData.append('expiry_unit', expiryUnit);
    if (password) formData.append('password', password);

    addLog(`Initiating upload: ${file.name} (${expiry})`, 'info');

    // Progress Simulation Logic
    // We simulate a "cinematic" upload speed (e.g., 2MB/s) to ensure the UI 
    // always shows activity, while also tracking real network progress.
    const SIMULATED_SPEED = 2 * 1024 * 1024; // 2MB/s
    const UPDATE_INTERVAL = 100; // 100ms
    const totalSize = file.size > 0 ? file.size : 1; // Avoid div by zero
    
    let simulatedBytes = 0;
    let realBytes = 0;
    
    const progressInterval = setInterval(() => {
        // Increment simulated bytes
        simulatedBytes += (SIMULATED_SPEED * (UPDATE_INTERVAL / 1000));
        
        // Use the greater of real vs simulated progress
        const effectiveBytes = Math.max(realBytes, simulatedBytes);
        
        // Calculate percentage, capped at 99% until request completes
        const percent = Math.min(99, Math.round((effectiveBytes / totalSize) * 100));
        
        onProgress(percent);
    }, UPDATE_INTERVAL);

    try {
      // Destination: POST /gateway
      const response = await clientRef.current.client.post('/gateway', formData, {
        headers: {
          'X-Meta': packedMeta,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (p) => {
          // Just update the real bytes tracker, let the interval handle the UI callback
          realBytes = p.loaded;
        }
      });
      
      // Clear simulation and force 100%
      clearInterval(progressInterval);
      onProgress(100);
      
      const fileCode = response.data.file_code;
      addLog(`Upload success. Code: ${fileCode}`, 'success');
      return fileCode;
    } catch (error: any) {
      clearInterval(progressInterval);
      const msg = error.response?.data?.detail || error.message;
      addLog(`Upload failed: ${msg}`, 'error');
      throw new Error(msg);
    }
  }, [isAuthenticated, addLog]);

  const runForensics = useCallback(async (fileCode: string): Promise<ForensicReport | null> => {
    if (!clientRef.current || !isAuthenticated) return null;

    addLog(`Running forensics scan on ${fileCode}...`, 'info');

    // AI Scan must go through the blind gateway (POST /gateway)
    // Never use GET /get or other endpoints for this action.
    const meta = {
      action: 'scan',
      file_code: fileCode
    };
    const packedMeta = clientRef.current.packMeta(meta);

    try {
      const response = await clientRef.current.client.post('/gateway', {}, {
        headers: { 'X-Meta': packedMeta }
      });
      
      addLog(`Forensics report received for ${fileCode}`, 'success');
      return response.data as ForensicReport;
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message;
      addLog(`Forensics failed: ${msg}`, 'error');
      throw new Error(msg);
    }
  }, [isAuthenticated, addLog]);

  const getFileInfo = useCallback(async (fileCode: string): Promise<FileInfo | null> => {
    if (!clientRef.current || !isAuthenticated) return null;

    const meta = { action: 'meta', file_code: fileCode };
    const packedMeta = clientRef.current.packMeta(meta);

    try {
      const response = await clientRef.current.client.post('/gateway', {}, {
        headers: { 'X-Meta': packedMeta }
      });
      
      const data = response.data;
      if (data && data.filename) {
        return {
          filename: data.filename,
          size: data.size,
          requires_password: data.requires_password,
          expiry_time: data.expiry_time,
          type: data.type || data.mime_type
        };
      }
      return null;
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message;
      addLog(`Metadata fetch failed: ${msg}`, 'error');
      throw new Error(msg);
    }
  }, [isAuthenticated, addLog]);

  const downloadFile = useCallback(async (fileCode: string, password?: string): Promise<boolean> => {
    if (!clientRef.current || !isAuthenticated) return false;
    
    addLog(`Requesting download token for ${fileCode}...`, 'info');
    
    // We use action 'meta' to get the token, passing password in body if needed
    const meta = { action: 'meta', file_code: fileCode };
    const packedMeta = clientRef.current.packMeta(meta);
    
    try {
        const body = password ? { password } : {};
        const response = await clientRef.current.client.post('/gateway', body, {
            headers: { 'X-Meta': packedMeta }
        });
        
        const { dl_token } = response.data;
        
        if (dl_token) {
            addLog(`Token acquired. Opening download stream.`, 'success');
            
            // Construct standard GET URL without signatures, using the token
            let downloadUrl = `${API_BASE_URL}/get/${fileCode}?token=${dl_token}`;
            
            if (password) {
                downloadUrl += `&password=${encodeURIComponent(password)}`;
            }

            // Trigger the download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', ''); // Native browser download
            document.body.appendChild(link);
            link.click();
            link.remove();
            return true;
        } else {
             if (response.data.requires_password) {
                 addLog(`Download failed: Password required.`, 'warn');
                 throw new Error("Password required.");
             } else {
                 addLog(`Download failed: No token returned.`, 'error');
                 throw new Error("No token returned.");
             }
        }
    } catch (error: any) {
        const msg = error.response?.data?.detail || error.message;
        addLog(`Download request failed: ${msg}`, 'error');
        throw new Error(msg);
    }
  }, [isAuthenticated, addLog]);

  const deleteFile = useCallback(async (fileCode: string): Promise<boolean> => {
    if (!clientRef.current || !isAuthenticated) return false;

    addLog(`Initiating permanent deletion for ${fileCode}...`, 'warn');

    const meta = { action: 'kill', file_code: fileCode };
    const packedMeta = clientRef.current.packMeta(meta);

    try {
      const response = await clientRef.current.client.post('/gateway', {}, {
        headers: { 'X-Meta': packedMeta }
      });
      
      if (response.data.status === 'success') {
         addLog(`File ${fileCode} permanently destroyed.`, 'success');
         return true;
      }
      throw new Error("Deletion failed on server.");
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message;
      addLog(`Deletion failed: ${msg}`, 'error');
      throw new Error(msg);
    }
  }, [isAuthenticated, addLog]);

  const scrubMetadata = useCallback(async (fileCode: string): Promise<string | null> => {
    if (!clientRef.current || !isAuthenticated) return null;

    addLog(`Initiating metadata scrub for ${fileCode}...`, 'info');

    const meta = { action: 'wipe', file_code: fileCode };
    const packedMeta = clientRef.current.packMeta(meta);

    try {
      const response = await clientRef.current.client.post('/gateway', {}, {
        headers: { 'X-Meta': packedMeta }
      });
      
      const newFileCode = response.data.file_code;
      if (newFileCode) {
         addLog(`Scrub complete. New Identity: ${newFileCode}`, 'success');
         return newFileCode;
      }
      throw new Error("Scrub failed on server.");
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message;
      addLog(`Scrub failed: ${msg}`, 'error');
      throw new Error(msg);
    }
  }, [isAuthenticated, addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };
  }, []);

  return (
    <VaultContext.Provider value={{ 
      isAuthenticated, 
      isConnecting, 
      initializeSession, 
      terminateSession,
      client: clientRef.current, 
      logs,
      addLog,
      uploadFile,
      runForensics,
      getFileInfo,
      downloadFile,
      deleteFile,
      scrubMetadata
    }}>
      {children}
    </VaultContext.Provider>
  );
};
