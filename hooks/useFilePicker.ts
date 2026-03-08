import React, { useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export const useFilePicker = (onFileSelect: (file: File) => void) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      console.log('Opening native file picker via input element');
      // On Android, sometimes we need to ensure permissions are granted
      // But usually the WebChromeClient handles the intent.
    }
    
    if (inputRef.current) {
      // Reset value to allow selecting the same file again
      inputRef.current.value = '';
      
      // Add a small delay for touch feedback on mobile
      if (Capacitor.isNativePlatform()) {
          setTimeout(() => {
              inputRef.current?.click();
          }, 50);
      } else {
          inputRef.current.click();
      }
    } else {
      console.error('File input ref is null');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, file.size, file.type);
      onFileSelect(file);
    } else {
      console.log('No file selected or file selection cancelled');
    }
  }, [onFileSelect]);

  return {
    inputRef,
    openFilePicker,
    handleFileChange
  };
};
