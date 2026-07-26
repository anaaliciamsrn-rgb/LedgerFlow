'use client';

import { useContext } from 'react';
import { A11yContext, type A11yContextValue } from '@/contexts/a11y.context';

export function useA11y(): A11yContextValue {
  const context = useContext(A11yContext);
  if (context === null) {
    throw new Error('useA11y deve ser usado dentro de A11yProvider');
  }
  return context;
}
