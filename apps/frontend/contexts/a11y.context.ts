'use client';

import { createContext } from 'react';
import type { A11yPreferences } from '@/features/settings/types/a11y.types';

export interface A11yContextValue {
  readonly preferences: A11yPreferences;
  readonly setPreference: <K extends keyof A11yPreferences>(
    key: K,
    value: A11yPreferences[K],
  ) => void;
  readonly reset: () => void;
}

export const A11yContext = createContext<A11yContextValue | null>(null);
