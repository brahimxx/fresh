'use client';

import { Toaster } from 'sonner';

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </>
  );
}
