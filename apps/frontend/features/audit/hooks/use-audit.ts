'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { auditService } from '@/features/audit/services/audit.service';
import { queryKeys } from '@/constants/query-keys';
import { useTenant } from '@/features/auth/hooks/use-tenant';

export function useRunPortfolioAudit() {
  return useMutation({ mutationFn: () => auditService.runPortfolio() });
}

export function useAuditDetail(id: string | null) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: queryKeys.audit.detail(tenantId, id ?? ''),
    queryFn: ({ signal }) => auditService.getById(id as string, signal),
    enabled: id !== null,
  });
}
