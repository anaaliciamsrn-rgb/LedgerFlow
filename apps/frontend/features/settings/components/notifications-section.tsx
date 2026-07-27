'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SettingRow } from '@/features/settings/components/setting-row';
import { ToggleSwitch } from '@/features/settings/components/toggle-switch';

interface NotificationPrefs {
  readonly auditAlerts: boolean;
  readonly deadlineReminders: boolean;
  readonly newCompanies: boolean;
  readonly weeklyDigest: boolean;
}

export function NotificationsSection(): React.ReactNode {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    auditAlerts: true,
    deadlineReminders: true,
    newCompanies: false,
    weeklyDigest: true,
  });

  function toggle(key: keyof NotificationPrefs, value: boolean): void {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border p-6">
        <SettingRow
          label="Alertas de auditoria"
          description="Receba avisos quando irregularidades forem detectadas."
          control={<ToggleSwitch label="Alertas de auditoria" checked={prefs.auditAlerts} onCheckedChange={(v) => toggle('auditAlerts', v)} />}
        />
        <SettingRow
          label="Lembretes de prazo"
          description="Avisos sobre vencimentos e obrigações próximas."
          control={<ToggleSwitch label="Lembretes de prazo" checked={prefs.deadlineReminders} onCheckedChange={(v) => toggle('deadlineReminders', v)} />}
        />
        <SettingRow
          label="Novas empresas"
          description="Notificação quando uma empresa é adicionada à carteira."
          control={<ToggleSwitch label="Novas empresas" checked={prefs.newCompanies} onCheckedChange={(v) => toggle('newCompanies', v)} />}
        />
        <SettingRow
          label="Resumo semanal"
          description="Um panorama da carteira enviado toda segunda-feira."
          control={<ToggleSwitch label="Resumo semanal" checked={prefs.weeklyDigest} onCheckedChange={(v) => toggle('weeklyDigest', v)} />}
        />
      </CardContent>
    </Card>
  );
}
