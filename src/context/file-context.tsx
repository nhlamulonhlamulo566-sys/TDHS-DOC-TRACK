
'use client';

import React, { createContext, useContext, ReactNode } from 'react';

// --- sessionStorage Keys ---
const FILE_STORE_KEY = 'tdhsFileStore';

interface StoredFile {
  name: string;
  type: string;
  content: string; // Base64 encoded content
}

interface FileContextType {
  storeFile: (file: File, onProgress: (percentage: number) => void) => Promise<string>;
  getFile: (fileId: string) => Promise<File | null>;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

// Helper to read a file as a Base64 string with progress
const toBase64 = (file: File, onProgress: (percentage: number) => void): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress(percentage);
      }
    };
    
    reader.readAsDataURL(file);

    reader.onload = () => {
      // Result is a data URL like "data:image/png;base64,iVBORw0KGgo...", we only want the base64 part.
      const base64String = (reader.result as string).split(',')[1];
      if (base64String) {
        onProgress(100); // Ensure it completes at 100%
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert file to Base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
});

// Helper to convert a Base64 string back to a File object
const fromBase64 = (base64: string, fileName: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
};


export function FileProvider({ children }: { children: ReactNode }) {
  
  const getFileStore = (): Record<string, StoredFile> => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = window.sessionStorage.getItem(FILE_STORE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("Failed to parse file store from sessionStorage", e);
      return {};
    }
  };

  const setFileStore = (store: Record<string, StoredFile>) => {
     if (typeof window === 'undefined') return;
     try {
        window.sessionStorage.setItem(FILE_STORE_KEY, JSON.stringify(store));
     } catch (e) {
        console.error("Failed to save file store to sessionStorage", e);
     }
  };

  const storeFile = async (file: File, onProgress: (percentage: number) => void): Promise<string> => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const fileContent = await toBase64(file, onProgress);
    
    const store = getFileStore();
    store[fileId] = {
      name: file.name,
      type: file.type,
      content: fileContent,
    };
    setFileStore(store);

    return fileId;
  };

  const getFile = async (fileId: string): Promise<File | null> => {
    const store = getFileStore();
    const storedFile = store[fileId];

    if (storedFile) {
      try {
        return fromBase64(storedFile.content, storedFile.name, storedFile.type);
      } catch (e) {
        console.error(`Failed to decode file for id ${fileId}`, e);
        return null;
      }
    }
    
    return null;
  };

  const value: FileContextType = {
    storeFile,
    getFile,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}

export function useFileContext() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
}
