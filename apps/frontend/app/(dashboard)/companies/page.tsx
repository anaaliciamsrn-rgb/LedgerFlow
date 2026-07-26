import type { ReactNode } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { companiesService } from '@/features/companies/services/companies.service';
import { queryKeys } from '@/constants/query-keys';
import { authService } from '@/features/auth/services/auth.service';
import { CompaniesView } from '@/features/companies/components/companies-view';

export default async function CompaniesPage(): Promise<ReactNode> {
  const session = await authService.getSession();
  const queryClient = getQueryClient();

  if (session) {
    const params = { page: 1, search: '' };
    await queryClient.prefetchQuery({
      queryKey: queryKeys.companies.list(session.tenant.id, params),
      queryFn: () => companiesService.list(params),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CompaniesView />
    </HydrationBoundary>
  );
}