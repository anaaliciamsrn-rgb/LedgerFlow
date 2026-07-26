'use client';

import { useMemo, type ReactNode } from 'react';
import {
  SessionContext,
  type SessionContextValue,
} from '@/contexts/session.context';
import type { UserSession } from '@/types/session.types';

interface SessionProviderProps {
  readonly session: UserSession | null;
  readonly children: ReactNode;
}

export function SessionProvider({
  session,
  children,
}: SessionProviderProps): ReactNode {
  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isAuthenticated: session !== null,
    }),
    [session],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}