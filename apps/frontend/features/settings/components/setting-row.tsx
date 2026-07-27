import type { ReactNode } from 'react';

interface SettingRowProps {
  readonly label: string;
  readonly description?: string;
  readonly control: ReactNode;
}

export function SettingRow({ label, description, control }: SettingRowProps): ReactNode {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
