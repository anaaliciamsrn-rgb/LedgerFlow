import { CheckCircle2, XCircle, AlertTriangle, PauseCircle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RegistrationStatus } from '@/features/companies/schemas/cnpj-lookup.schema';

const STATUS_CONFIG: Record<
  RegistrationStatus,
  { readonly label: string; readonly variant: 'success' | 'destructive' | 'warning' | 'secondary'; readonly icon: typeof CheckCircle2 }
> = {
  ATIVA: { label: 'Ativa', variant: 'success', icon: CheckCircle2 },
  BAIXADA: { label: 'Baixada', variant: 'secondary', icon: XCircle },
  INAPTA: { label: 'Inapta', variant: 'destructive', icon: Ban },
  SUSPENSA: { label: 'Suspensa', variant: 'warning', icon: PauseCircle },
  NULA: { label: 'Nula', variant: 'destructive', icon: AlertTriangle },
};

interface RegistrationStatusBadgeProps {
  readonly status: RegistrationStatus;
}

export function RegistrationStatusBadge({ status }: RegistrationStatusBadgeProps): React.ReactNode {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}
