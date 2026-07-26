'use client';

import { Toaster } from '@/components/ui/sonner';
import type { ReactNode } from 'react';

interface ToastProviderProps {
  readonly children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): ReactNode {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 4000 }}
      />
    </>
  );
}