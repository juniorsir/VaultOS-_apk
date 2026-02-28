
import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { useVault } from './useVault';
import { ForensicReport, FileInfo } from '../types';
import { API_BASE_URL } from '../api/secureClient';

interface UseSecureClientProps {
  onNotify?: (message: string, type: 'success' | 'error' | 'info' | 'warn') => void;
}

export const useSecureClient = ({ onNotify }: UseSecureClientProps = {}) => {
  // Use global state from context
  const { 
    client, 
    isAuthenticated: isConnected, 
    isConnecting, 
    initializeSession: connect, 
    logs, 
    addLog,
    uploadFile: contextUploadFile,
    runForensics: contextRunForensics,
    getFileInfo: contextGetFileInfo,
    downloadFile: contextDownloadFile,
    deleteFile: contextDeleteFile,
    scrubMetadata: contextScrubMetadata
  } = useVault();
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApiError = (error: any, operation: string) => {
    let errorMessage = error instanceof AxiosError
        ? error.response?.data?.detail || error.message
        : error.message;

    if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('not found')) {
        errorMessage = "This file might be deleted";
    }

    addLog(`${operation} failure: ${errorMessage}`, 'error');
    onNotify?.(`${operation} Failed: ${errorMessage}`, 'error');
    return errorMessage;
  };

  const uploadFile = useCallback(async (
    file: File, 
    password: string = '', 
    expiry: string = '24h',
    onProgress: (progress: number) => void
  ) => {
    if (!isConnected) return null;
    setIsProcessing(true);
    onProgress(0);

    try {
      const code = await contextUploadFile(file, password, expiry, onProgress);
      if (code) {
        onNotify?.(`✅ Upload Complete: ${code}`, 'success');
      }
      return code;
    } catch (error) {
      handleApiError(error, 'Upload');
      return null;
    } finally { 
      setIsProcessing(false); 
    }
  }, [isConnected, contextUploadFile, onNotify]);

  const downloadFile = useCallback(async (fileCode: string, password: string = '') => {
    if (!isConnected) return;
    setIsProcessing(true);
    try {
        // Native browser download via token
        const success = await contextDownloadFile(fileCode, password);
        if (success) {
            onNotify?.(`🚀 Download started for ${fileCode}`, 'success');
        } else {
            onNotify?.(`❌ Download failed or password required.`, 'error');
        }
    } catch (error) { 
        handleApiError(error, 'Download'); 
    } finally { 
        setIsProcessing(false); 
    }
  }, [isConnected, contextDownloadFile, onNotify]);

  const deleteFile = useCallback(async (fileCode: string) => {
    if (!isConnected) return;
    setIsProcessing(true);
    try {
        const success = await contextDeleteFile(fileCode);
        if (success) {
            onNotify?.("🗑️ File successfully wiped from cloud.", "success");
        }
    } catch (error) { handleApiError(error, 'Delete'); }
    finally { setIsProcessing(false); }
  }, [isConnected, contextDeleteFile, onNotify]);

  const getFileInfo = useCallback(async (fileCode: string): Promise<FileInfo | null> => {
    if (!isConnected) return null;
    setIsProcessing(true);
    try {
        return await contextGetFileInfo(fileCode);
    } catch (error) { 
        handleApiError(error, 'Metadata'); 
        return null; 
    } finally { 
        setIsProcessing(false); 
    }
  }, [isConnected, contextGetFileInfo]);

  const analyzeFile = useCallback(async (fileCode: string): Promise<ForensicReport | null> => {
    if (!isConnected) return null;
    setIsProcessing(true);
    try {
        return await contextRunForensics(fileCode);
    } catch (error) { 
        handleApiError(error, 'Forensics');
        return null; 
    } finally { 
        setIsProcessing(false); 
    }
  }, [isConnected, contextRunForensics]);

  const scrubMetadata = useCallback(async (fileCode: string): Promise<string | null> => {
    if (!isConnected) return null;
    setIsProcessing(true);
    try {
        const newCode = await contextScrubMetadata(fileCode);
        if (newCode) {
            onNotify?.('Forensic metadata scrubbed.', 'success');
        }
        return newCode;
    } catch (error) { handleApiError(error, 'Scrub'); return null; }
    finally { setIsProcessing(false); }
  }, [isConnected, contextScrubMetadata, onNotify]);

  const fetchFileBlob = useCallback(async (fileCode: string, password: string = '') => {
    if (!client || !isConnected) return { error: "Secure client not connected" };
    try {
        const protocol = client.getProtocol();
        let downloadUrl = '';
        let type = 'application/octet-stream';

        // Fetch metadata first to get type
        const info = await getFileInfo(fileCode);
        if (info) type = info.type || type;

        if (protocol === 'HARDENED') {
            // Get token first using signed request
            const meta = client.packMeta({ action: 'meta', file_code: fileCode });
            const body = password ? { password } : {};
            let tokenRes;
            try {
                tokenRes = await client.client.post('/gateway', body, { headers: { 'X-Meta': meta } });
            } catch (e: any) {
                if (e.response && e.response.status === 403) {
                     throw new Error("Invalid password or access denied");
                }
                throw e;
            }
            const token = tokenRes.data.dl_token;
            
            if (!token) throw new Error("No preview token received");

            // Construct direct streaming URL with token
            downloadUrl = `${API_BASE_URL}/get/${fileCode}?token=${token}`;
            if (password) {
                downloadUrl += `&password=${encodeURIComponent(password)}`;
            }
        } else {
            const queryParams = password ? `?password=${encodeURIComponent(password)}` : '';
            // Use plain axios (unsigned) for legacy get
            downloadUrl = `${API_BASE_URL}/get/${fileCode}${queryParams}`;
        }
        
        // Fetch the actual blob to bypass Content-Disposition: attachment for images
        const isImage = type.startsWith('image/') || (info?.filename && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(info.filename.split('.').pop()?.toLowerCase() || ''));
        const isMedia = type.startsWith('video/') || type.startsWith('audio/') || (info?.filename && ['mp4', 'webm', 'ogg', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'mov', 'avi', 'mkv'].includes(info.filename.split('.').pop()?.toLowerCase() || ''));
        
        // For encrypted media or images, fetch as blob to ensure auth/decryption works reliably
        // Unencrypted media can stream directly
        if (isImage || (isMedia && password)) {
            const response = await axios.get(downloadUrl, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(response.data);
            return { url: blobUrl, type: response.data.type || type };
        }
        
        // For unencrypted media, return the direct URL to allow streaming/buffering
        if (isMedia) {
             return { url: downloadUrl, type: type };
        }

        if (isImage) {
            // This block is now redundant but kept for safety if logic changes above, 
            // though the first if block covers isImage. 
            // Actually, let's remove this redundant block in the replacement.
        }
        
        return { url: downloadUrl, type };
    } catch (error: any) { 
        console.error("Preview fetch failed:", error);
        let msg = error instanceof AxiosError 
            ? error.response?.data?.detail || error.message 
            : error.message || "Failed to load preview";
            
        if (typeof msg === 'string' && msg.toLowerCase().includes('not found')) {
            msg = "This file might be deleted";
        }
        return { error: msg }; 
    }
  }, [client, isConnected, getFileInfo]);

  return { logs, isConnected, connect, uploadFile, downloadFile, fetchFileBlob, deleteFile, getFileInfo, analyzeFile, scrubMetadata, isConnecting, isProcessing };
};
