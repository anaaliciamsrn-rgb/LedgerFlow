import { Badge } from '@/components/ui/badge';
import type { FindingResult } from '@/features/audit/types/audit.types';

const LABELS: Record<FindingResult, string> = {
  passed: 'OK',
  failed: 'Divergência',
  skipped: 'Não verificado',
};

// `success` e `secondary` já existem em components/ui/badge.tsx.
const VARIANTS: Record<FindingResult, 'success' | 'destructive' | 'secondary'> = {
  passed: 'success',
  failed: 'destructive',
  skipped: 'secondary',
};

export function FindingBadge({ result }: { readonly result: FindingResult }): React.ReactNode {
  return <Badge variant={VARIANTS[result]}>{LABELS[result]}</Badge>;
}
