'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { A11yContext, type A11yContextValue } from '@/contexts/a11y.context';
import {
  A11Y_COOKIE_NAME,
  DEFAULT_A11Y_PREFERENCES,
  type A11yPreferences,
} from '@/features/settings/types/a11y.types';
import { a11yClassNames } from '@/features/settings/lib/a11y-cookie';

const A11Y_CLASS_PREFIX = 'a11y-';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function writeCookie(preferences: A11yPreferences): void {
  const value = encodeURIComponent(JSON.stringify(preferences));
  document.cookie = `${A11Y_COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

function applyClasses(preferences: A11yPreferences): void {
  const root = document.documentElement;
  const toRemove: string[] = [];
  root.classList.forEach((cls) => {
    if (cls.startsWith(A11Y_CLASS_PREFIX)) {
      toRemove.push(cls);
    }
  });
  root.classList.remove(...toRemove);
  const next = a11yClassNames(preferences).split(' ').filter(Boolean);
  root.classList.add(...next);
}

interface A11yProviderProps {
  readonly initialPreferences: A11yPreferences;
  readonly children: React.ReactNode;
}

export function A11yProvider({ initialPreferences, children }: A11yProviderProps): React.ReactNode {
  const [preferences, setPreferences] = useState<A11yPreferences>(initialPreferences);

  useEffect(() => {
    applyClasses(preferences);
    writeCookie(preferences);
  }, [preferences]);

  const setPreference = useCallback(
    <K extends keyof A11yPreferences>(key: K, value: A11yPreferences[K]): void => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback((): void => {
    setPreferences(DEFAULT_A11Y_PREFERENCES);
  }, []);

  const value = useMemo<A11yContextValue>(
    () => ({ preferences, setPreference, reset }),
    [preferences, setPreference, reset],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}
