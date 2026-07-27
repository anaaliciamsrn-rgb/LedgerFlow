'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingRow } from '@/features/settings/components/setting-row';
import { ToggleSwitch } from '@/features/settings/components/toggle-switch';
import { SegmentedControl } from '@/features/settings/components/segmented-control';
import { useA11y } from '@/features/settings/hooks/use-a11y';
import type { FontScale, Density } from '@/features/settings/types/a11y.types';

const FONT_OPTIONS = [
  { value: 'sm' as FontScale, label: 'A−' },
  { value: 'base' as FontScale, label: 'A' },
  { value: 'lg' as FontScale, label: 'A+' },
];

const DENSITY_OPTIONS = [
  { value: 'compact' as Density, label: 'Compacta' },
  { value: 'normal' as Density, label: 'Normal' },
  { value: 'comfortable' as Density, label: 'Confortável' },
];

export function AccessibilitySection(): React.ReactNode {
  const { preferences, setPreference, reset } = useA11y();

  return (
    <Card>
      <CardContent className="divide-y divide-border p-6">
        <SettingRow
          label="Alto contraste"
          description="Aumenta o contraste de cores e bordas para melhor legibilidade."
          control={
            <ToggleSwitch
              label="Alto contraste"
              checked={preferences.highContrast}
              onCheckedChange={(v) => setPreference('highContrast', v)}
            />
          }
        />
        <SettingRow
          label="Reduzir movimento"
          description="Diminui animações e transições da interface."
          control={
            <ToggleSwitch
              label="Reduzir movimento"
              checked={preferences.reducedMotion}
              onCheckedChange={(v) => setPreference('reducedMotion', v)}
            />
          }
        />
        <SettingRow
          label="Tamanho da fonte"
          description="Ajusta o tamanho do texto em toda a interface."
          control={
            <SegmentedControl
              ariaLabel="Tamanho da fonte"
              value={preferences.fontScale}
              options={FONT_OPTIONS}
              onValueChange={(v) => setPreference('fontScale', v)}
            />
          }
        />
        <SettingRow
          label="Densidade"
          description="Controla o espaçamento entre os elementos."
          control={
            <SegmentedControl
              ariaLabel="Densidade da interface"
              value={preferences.density}
              options={DENSITY_OPTIONS}
              onValueChange={(v) => setPreference('density', v)}
            />
          }
        />
        <div className="flex justify-end pt-4">
          <Button variant="outline" size="sm" onClick={reset}>
            Restaurar padrões
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
