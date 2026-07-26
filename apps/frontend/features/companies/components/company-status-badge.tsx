import { Badge } from '@/components/ui/badge';
import type { CompanyStatus } from '@/features/companies/types/company.types';

const STATUS_CONFIG: Record<CompanyStatus, { readonly label: string; readonly variant: 'success' | 'secondary' | 'warning' }> = {
  active: { label: 'Ativa', variant: 'success' },
  inactive: { label: 'Inativa', variant: 'secondary' },
  pending: { label: 'Pendente', variant: 'warning' },
};

interface CompanyStatusBadgeProps {
  readonly status: CompanyStatus;
}

export function CompanyStatusBadge({ status }: CompanyStatusBadgeProps): React.ReactNode {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}