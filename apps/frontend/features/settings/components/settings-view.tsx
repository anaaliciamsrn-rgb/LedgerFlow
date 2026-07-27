'use client';

import { useState } from 'react';
import { Palette, Accessibility, Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';
import { AppearanceSection } from '@/features/settings/components/appearance-section';
import { AccessibilitySection } from '@/features/settings/components/accessibility-section';
import { NotificationsSection } from '@/features/settings/components/notifications-section';

type TabId = 'appearance' | 'accessibility' | 'notifications';

interface Tab {
  readonly id: TabId;
  readonly label: string;
  readonly icon: LucideIcon;
}

const TABS: readonly Tab[] = [
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'accessibility', label: 'Acessibilidade', icon: Accessibility },
  { id: 'notifications', label: 'Notificações', icon: Bell },
];

export function SettingsView(): React.ReactNode {
  const [active, setActive] = useState<TabId>('appearance');

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Gerencie as preferências da sua conta e da interface." />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Seções de configurações" className="flex gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActive(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {active === 'appearance' ? <AppearanceSection /> : null}
          {active === 'accessibility' ? <AccessibilitySection /> : null}
          {active === 'notifications' ? <NotificationsSection /> : null}
        </div>
      </div>
    </div>
  );
}
