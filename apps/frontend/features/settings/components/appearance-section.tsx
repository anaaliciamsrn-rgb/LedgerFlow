'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent } from '@/components/ui/card';
import { SettingRow } from '@/features/settings/components/setting-row';
import { SegmentedControl } from '@/features/settings/components/segmented-control';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
] as const;

export function AppearanceSection(): React.ReactNode {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card>
      <CardContent className="divide-y divide-border p-6">
        <SettingRow
          label="Tema"
          description="Escolha entre claro, escuro ou seguir o sistema."
          control={
            mounted ? (
              <SegmentedControl
                ariaLabel="Tema da interface"
                value={(theme as 'light' | 'dark' | 'system') ?? 'system'}
                options={THEME_OPTIONS}
                onValueChange={setTheme}
              />
            ) : (
              <div className="h-8 w-48" />
            )
          }
        />
      </CardContent>
    </Card>
  );
}
