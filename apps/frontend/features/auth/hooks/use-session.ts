'use client';

import { useContext } from 'react';
import {
  SessionContext,
  type SessionContextValue,
} from '@/contexts/session.context';

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === null) {
    throw new Error('useSession deve ser usado dentro de SessionProvider');
  }
  return context;
}