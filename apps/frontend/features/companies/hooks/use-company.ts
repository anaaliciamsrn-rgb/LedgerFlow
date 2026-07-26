'use client';

import { useQuery } from '@tanstack/react-query';
import { companiesService } from '@/features/companies/services/companies.service';
import { queryKeys } from '@/constants/query-keys';
import { useTenant } from '@/features/auth/hooks/use-tenant';

export function useCompany(companyId: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: queryKeys.companies.detail(tenantId, companyId),
    queryFn: ({ signal }) => companiesService.getById(companyId, signal),
    enabled: companyId.length > 0,
  });
}