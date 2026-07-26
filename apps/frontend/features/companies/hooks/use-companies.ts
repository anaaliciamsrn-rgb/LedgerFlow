'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { companiesService } from '@/features/companies/services/companies.service';
import { queryKeys } from '@/constants/query-keys';
import { useTenant } from '@/features/auth/hooks/use-tenant';
import type { QueryParams } from '@/types/common.types';

export function useCompanies(params?: QueryParams) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: queryKeys.companies.list(tenantId, params),
    queryFn: ({ signal }) => companiesService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}