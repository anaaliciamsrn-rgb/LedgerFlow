'use client';

import { createContext } from 'react';
import type { UserSession } from '@/types/session.types';

export interface SessionContextValue {
  readonly session: UserSession | null;
  readonly isAuthenticated: boolean;
}

export const SessionContext = createContext<SessionContextValue | null>(null);